import CustomError from "../utils/customError.js";
import { ERROR_MESSAGES } from "../utils/errorMessages.js";

export function organizerMiddleware(req, res, next) {
  if (req.user?.role !== 'organizer') {
    throw new CustomError(ERROR_MESSAGES.ORGANIZER_FIELD, 403);
  }

  next();
}