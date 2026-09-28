
export const BookingController = {
    async getAllbooking (req, res, next) {
        try {            
            const userId = req.user.id;
            res.send("Hi controller here handling your bookings")
            res.status(200).json()
        } catch (error) {
            next(error)
        }
    },

    async getAllMybBooking (req, res, next) {
        try {
            const user_id = req.user.id;
            res.send("Hi your controller here hanling your personal bookings")
            res.status(200).json()
        } catch (error) {
            next(error)
        }
    },

    async BookTicket (req, res, next) {
        try {
            const { eventId, userId, events, seatsBooked, status} = req.body;
            res.send("Hi yor controller here handling all your request")
        } catch (error) {
            next(error)
        }
    }
}