import { Router } from "express";
import { authMiddleware } from "../middlewares/authMidlewares.js";
import { BookingController } from "../controllers/bookingControler.js";

const router = Router();

router.use(authMiddleware);

router.get("/", BookingController.getAllbooking)

router.get("/my-bookings", BookingController.getAllMybBooking)

router.post("/", BookingController.BookTicket)


router.patch("/", (req, res) => {
    res.send("This is bookings route")
})

router.delete("/", (req, res) => {
    res.send("This is bookings route")
})

export default router 