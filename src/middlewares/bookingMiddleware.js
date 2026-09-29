import CustomError from "../utils/customError.js";
import { ERROR_MESSAGES } from "../utils/errorMessages.js";

export function bookingMiddleware(req, res, next) {
  if (req.user?.role !== 'attendee') {
    throw new CustomError(ERROR_MESSAGES.ATTENDEE_FIELD, 403);
  }

  next();
}