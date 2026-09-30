import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app/app.js";
import db from "../src/config/db.js";

const eventPayload = {
  title: "Booking Test Event",
  description: "Event fixture for booking endpoint tests",
  venue: "Test Hall",
  event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  ticket_price: 20,
  total_seats: 25,
};

describe("Bookings API", () => {
  const testEmails = [];
  let organizer;
  let attendee;
  let otherAttendee;
  let eventId;
  let attendeeBooking;
  let otherAttendeeBooking;

  async function signup(role) {
    const email = `bookings-${role}-${randomUUID()}@example.com`;
    testEmails.push(email);

    const response = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: `Booking ${role}`,
        email,
        password: "Password123!",
        role,
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    return {
      id: response.body.user.id,
      token: response.body.accessToken,
    };
  }

  async function createBooking(user, seatsBooked = 1) {
    return request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ event_id: eventId, seatsBooked });
  }

  beforeAll(async () => {
    organizer = await signup("organizer");
    attendee = await signup("attendee");
    otherAttendee = await signup("attendee");

    const eventResponse = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${organizer.token}`)
      .send(eventPayload);

    expect(eventResponse.status).toBe(200);
    eventId = eventResponse.body.id;
    expect(eventId).toBeTruthy();

    const bookingResponse = await createBooking(attendee, 2);
    expect(bookingResponse.status).toBe(200);
    attendeeBooking = bookingResponse.body;

    const otherBookingResponse = await createBooking(otherAttendee, 1);
    expect(otherBookingResponse.status).toBe(200);
    otherAttendeeBooking = otherBookingResponse.body;
  }, 45_000);

  afterAll(async () => {
    if (testEmails.length > 0) {
      await db.query("DELETE FROM users WHERE email = ANY($1::text[])", [
        testEmails,
      ]);
    }
  });

  it("requires authentication for booking endpoints", async () => {
    const allResponse = await request(app).get("/api/v1/bookings");
    const personalResponse = await request(app).get(
      "/api/v1/bookings/my-bookings",
    );
    const createResponse = await request(app)
      .post("/api/v1/bookings")
      .send({ event_id: eventId, seatsBooked: 1 });

    expect(allResponse.status).toBe(401);
    expect(personalResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
  });

  it("allows an organizer to list bookings across events and attendees", async () => {
    const response = await request(app)
      .get("/api/v1/bookings")
      .set("Authorization", `Bearer ${organizer.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: attendeeBooking.id }),
        expect.objectContaining({ id: otherAttendeeBooking.id }),
      ]),
    );
  });

  it("does not allow attendees to list every user's bookings", async () => {
    const response = await request(app)
      .get("/api/v1/bookings")
      .set("Authorization", `Bearer ${attendee.token}`);

    expect(response.status).toBe(403);
  });

  it("creates bookings against an existing event and calculates the amount", async () => {
    expect(attendeeBooking.event_id).toBe(eventId);
    expect(attendeeBooking.user_id).toBe(attendee.id);
    expect(attendeeBooking.seats_booked).toBe(2);
    expect(attendeeBooking.total_amount).toBe(40);
    expect(attendeeBooking.status).toBe("confirmed");

    const eventResponse = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendee.token}`);

    expect(eventResponse.status).toBe(200);
    expect(eventResponse.body.available_seats).toBe(22);
  });

  it("shows each attendee only their own bookings and booking details", async () => {
    const listResponse = await request(app)
      .get("/api/v1/bookings/my-bookings")
      .set("Authorization", `Bearer ${attendee.token}`);
    const detailResponse = await request(app)
      .get(`/api/v1/bookings/my-bookings/${attendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`);
    const otherDetailResponse = await request(app)
      .get(`/api/v1/bookings/my-bookings/${otherAttendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual([
      expect.objectContaining({ id: attendeeBooking.id }),
    ]);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.id).toBe(attendeeBooking.id);
    expect(otherDetailResponse.status).toBe(403);
  });

  it("allows attendees to update their booking but rejects another attendee's update", async () => {
    const ownResponse = await request(app)
      .patch(`/api/v1/bookings/my-bookings/${attendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`)
      .send({ status: "cancelled" });
    const otherResponse = await request(app)
      .patch(`/api/v1/bookings/my-bookings/${otherAttendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`)
      .send({ status: "cancelled" });

    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body.status).toBe("cancelled");
    expect(otherResponse.status).toBe(403);

    const eventResponse = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendee.token}`);
    expect(eventResponse.body.available_seats).toBe(24);
  });

  it("allows attendees to delete their booking but rejects another attendee's booking", async () => {
    const otherResponse = await request(app)
      .delete(`/api/v1/bookings/my-bookings/${otherAttendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`);
    const ownResponse = await request(app)
      .delete(`/api/v1/bookings/my-bookings/${attendeeBooking.id}`)
      .set("Authorization", `Bearer ${attendee.token}`);

    expect(otherResponse.status).toBe(403);
    expect(ownResponse.status).toBe(200);

    const eventResponse = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendee.token}`);
    expect(eventResponse.body.available_seats).toBe(24);

    const listResponse = await request(app)
      .get("/api/v1/bookings/my-bookings")
      .set("Authorization", `Bearer ${attendee.token}`);
    expect(listResponse.body).toEqual([]);
  });
});
