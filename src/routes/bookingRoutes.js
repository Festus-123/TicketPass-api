import { Router } from "express";
import { authMiddleware } from "../middlewares/authMidlewares.js";
import { BookingController } from "../controllers/bookingControler.js";
import { bookingMiddleware } from "../middlewares/bookingMiddleware.js";
import { organizerMiddleware } from "../middlewares/eventMiddleware.js";
import { validateData } from "../middlewares/validatorMiddleware.js";
import { createBookingSchema, updateBookingSchema } from "../schema/bookingSchema.js";

const router = Router();

router.get("/", authMiddleware, organizerMiddleware, BookingController.getAllBokking)
// router.get("/:id", authMiddleware, organizerMiddleware, BookingController.getBookingById)

router.use(authMiddleware, bookingMiddleware);

router.get("/my-bookings", BookingController.getAllMybBooking)
router.get("/my-bookings/:id", BookingController.getBookingById)

router.post("/", validateData(createBookingSchema), BookingController.BookTicket)

router.patch("/my-bookings/:id", validateData(updateBookingSchema), BookingController.updateTicket)
router.delete("/my-bookings/:id", BookingController.deleteTicket)

export default router 