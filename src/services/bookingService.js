import { bookingMiddleware } from "../middlewares/bookingMiddleware.js";
import { BookingModel, formatBooking } from "../model/bookingModel.js";
import { EventModel } from "../model/eventModel.js";
import { CustomError } from "../utils/customError.js";
import { ERROR_MESSAGES } from "../utils/errorMessages.js";

export const BookingService = {
  async getAllBookings() {
    return BookingModel.getAll();
  },

  async getAllMyBookings(userId) {
    return BookingModel.getAllMy(userId);
  },

  async getBookingById(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404);
    if (booking.user_id !== userId)
      throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);
    return formatBooking(booking);
  },

  async createBooking(newBooking) {
    const eventId = newBooking.eventId ?? newBooking.event_id;
    const seatsBooked = Number( newBooking.seatsBooked);
    const numericEventId = Number(eventId);
    if (
      numericEventId <= 0 ||
      seatsBooked <= 0
    ) {
      throw new CustomError(
        "A valid eventId and positive integer seats_booked are required",
        400,
      );
    }

    const event = await EventModel.findById(numericEventId);
    if (!event) throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404);

    const ticketPrice = Number(event.ticket_price);
    if (ticketPrice < 0) {
      throw new CustomError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    if (seatsBooked > Number(event.available_seats)) {
      throw new CustomError("Not enough seats available", 409);
    }

    const booked = await BookingModel.create({
      event_id: numericEventId,
      user_id: newBooking.userId,
      seats_booked: seatsBooked,
      total_amount: ticketPrice * seatsBooked,
      status: "confirmed",
    });

    if(booked) {
        await EventModel.update(numericEventId, {...event, available_seats: event.available_seats - seatsBooked})
    }

    return booked;
  },

  async updateBooking (ticketId, newValues, userId) {
    const ticket = await BookingModel.findById(ticketId)
    if (!ticket) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if (ticket.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);

    const payload = {...newValues};
    if (!['confirmed', 'cancelled'].includes(payload.status)) {
      throw new CustomError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    if (ticket.status === "cancelled" && payload.status === "confirmed") {
      throw new CustomError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    const updated = await BookingModel.update({ id: ticketId, payload })
    if (ticket.status !== "cancelled" && payload.status === "cancelled") {
      const event = await EventModel.findById(ticket.event_id);
      if (!event) throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404);
      await EventModel.update(ticket.event_id, {
        available_seats: Number(event.available_seats) + Number(ticket.seats_booked),
      });
    }

    return updated
  },

  async deleteBooking (ticketId, userId) {
    const ticket = await BookingModel.findById(ticketId)
    if (!ticket) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if (ticket.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);

    const event = ticket.status === "cancelled"
      ? null
      : await EventModel.findById(ticket.event_id);
    const rowsDeleted = await BookingModel.delete(ticketId);
    if(rowsDeleted === 0) throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404)
    
    if (event) {
      await EventModel.update(ticket.event_id, {
        available_seats: Number(event.available_seats) + Number(ticket.seats_booked),
      });
    }

    return { message: " Your ticket is canceled!"}
  }
};

