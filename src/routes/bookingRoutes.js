import { Router } from "express";
import { authMiddleware } from "../middlewares/authMidlewares.js";
import { BookingController } from "../controllers/bookingControler.js";
import { bookingMiddleware } from "../middlewares/bookingMiddleware.js";
import { organizerMiddleware } from "../middlewares/eventMiddleware.js";

const router = Router();

router.get("/", authMiddleware, organizerMiddleware, BookingController.getAllBokking)

router.use(authMiddleware, bookingMiddleware);

router.get("/my-bookings", BookingController.getAllMybBooking)

router.get("/:id", BookingController.getBookingById)

router.post("/", BookingController.BookTicket)


router.patch("/", (req, res) => {
    res.send("This is bookings route")
})

router.delete("/", (req, res) => {
    res.send("This is bookings route")
})

export default router 