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

  async geetBookingById(bookingId, userId) {
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

    return BookingModel.create({
      event_id: numericEventId,
      user_id: newBooking.userId,
      seats_booked: seatsBooked,
      total_amount: ticketPrice * seatsBooked,
      status: "confirmed",
    });
  },
};
