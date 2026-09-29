import { BookingService } from "../services/bookingService.js";

export const BookingController = {
    async getAllBokking (req, res, next) {
        try {
            const result = await BookingService.getAllBookings()
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    },

    async getAllMybBooking (req, res, next) {
        try {
            const userId = req.user.id;
            const result = await BookingService.getAllMyBookings(userId)
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    },

    async getBookingById (req, res, next) {
        try {
            const bookingId = parseInt(req.params.id)
            const userId = req.user.id;
            const result = await BookingService.getBookingById(bookingId, userId)
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    },

    async BookTicket (req, res, next) {
        try {
            const userId = req.user.id
            const payload = req.body
            const result = await BookingService.createBooking({...payload, userId})
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }
}