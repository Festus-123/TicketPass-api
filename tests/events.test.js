import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app/app.js";
import db from "../src/config/db.js";

const eventPayload = (overrides = {}) => ({
  title: "Test Event",
  description: "Event created by the event API test suite",
  venue: "Test Hall",
  event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  ticket_price: 25,
  total_seats: 30,
  ...overrides,
});

describe("Events API", () => {
  const testEmails = [];
  let organizerToken;
  let attendeeToken;
  let secondOrganizerToken;
  let eventId;

  async function signup(role) {
    const email = `events-${role}-${randomUUID()}@example.com`;
    testEmails.push(email);

    const response = await request(app).post("/api/v1/auth/signup").send({
      name: `Event ${role}`,
      email,
      password: "Password123!",
      role,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    return response.body.accessToken;
  }

  async function createEvent(token, overrides = {}) {
    return request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${token}`)
      .send(eventPayload(overrides));
  }

  beforeAll(async () => {
    organizerToken = await signup("organizer");
    attendeeToken = await signup("attendee");
    secondOrganizerToken = await signup("organizer");

    const response = await createEvent(organizerToken);
    expect(response.status).toBe(200);
    eventId = response.body.id;
    expect(eventId).toBeTruthy();
  }, 30_000);

  afterAll(async () => {
    if (testEmails.length > 0) {
      await db.query("DELETE FROM users WHERE email = ANY($1::text[])", [
        testEmails,
      ]);
    }
  });

  it("requires authentication to list and fetch events", async () => {
    const listResponse = await request(app).get("/api/v1/events");
    const detailResponse = await request(app).get(
      `/api/v1/events/${eventId}`,
    );

    expect(listResponse.status).toBe(401);
    expect(detailResponse.status).toBe(401);
  });

  it("lists events for an authenticated organizer", async () => {
    const response = await request(app)
      .get("/api/v1/events")
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: eventId })]),
    );
  });

  it("lists events for an authenticated attendee", async () => {
    const response = await request(app)
      .get("/api/v1/events")
      .set("Authorization", `Bearer ${attendeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: eventId })]),
    );
  });

  it("fetches one event by ID and returns 404 for an unknown ID", async () => {
    const response = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(eventId);

    const missingResponse = await request(app)
      .get("/api/v1/events/-1")
      .set("Authorization", `Bearer ${attendeeToken}`);
    expect(missingResponse.status).toBe(404);
  });

  it("allows an organizer to create an event", async () => {
    const response = await createEvent(organizerToken, {
      title: "Organizer Created Event",
    });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Organizer Created Event");
    expect(response.body.organizer_id).toBeDefined();
  });

  it("rejects attendees from creating events", async () => {
    const response = await createEvent(attendeeToken);

    expect(response.status).toBe(403);
  });

  it("rejects invalid event data", async () => {
    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ title: "Missing required fields" });

    expect(response.status).toBe(400);
  });

  it("allows the owning organizer to update an event", async () => {
    const response = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ title: "Updated Test Event" });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Updated Test Event");
  });

  it("rejects attendees and other organizers from updating an event", async () => {
    const attendeeResponse = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendeeToken}`)
      .send({ title: "Attendee Update" });

    const otherOrganizerResponse = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${secondOrganizerToken}`)
      .send({ title: "Other Organizer Update" });

    expect(attendeeResponse.status).toBe(403);
    expect(otherOrganizerResponse.status).toBe(403);
  });

  it("rejects attendees and other organizers from deleting, but permits the owner", async () => {
    const attendeeResponse = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${attendeeToken}`);

    const otherOrganizerResponse = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${secondOrganizerToken}`);

    expect(attendeeResponse.status).toBe(403);
    expect(otherOrganizerResponse.status).toBe(403);

    const ownerResponse = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.message).toMatch(/deleted/i);
  });
});
