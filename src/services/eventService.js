import { EventModel, formatEvent } from "../model/eventModel.js";
import { CustomError} from "../utils/customError.js"
import { ERROR_MESSAGES} from "../utils/errorMessages.js"

export const EventService = {
    async getAllEvents () {
        return EventModel.getAll()
    },

    async getEventById (eventId, ) {
        const event = await EventModel.findById(eventId);
    if (!event) throw new CustomError(ERROR_MESSAGES.NOT_FOUND, 404);
    // if (event.organizer_id !== organizerId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);
    return formatEvent(event)
    },

    async createEvent (newEvent) {
        const {organizerId, title, description, venue, event_date, ticket_price, total_seats} = newEvent;
        if (!title?.trim() || !venue?.trim() || !event_date || total_seats == null) {
            throw new CustomError("title, venue, event_date, and total_seats are required", 400);
        }

        const eventToCreate = {
            organizer_id: organizerId,
            title: title.trim(),
            description: description?.trim() || null,
            venue: venue.trim(),
            event_date: event_date || null,
            ticket_price: ticket_price,
            total_seats: total_seats,
            available_seats: total_seats,
            // userId
        }
        return EventModel.create(eventToCreate);
    }
}