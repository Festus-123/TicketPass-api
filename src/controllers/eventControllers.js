import { EventService } from "../services/eventService.js";

export const EventController = {
  async getEvents(req, res, next) {
    try {
      const result = await EventService.getAllEvents()
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getEventById(req, res, next) {
    try {
      const eventId = parseInt(req.params.id);
      const result = await EventService.getEventById(eventId)
      res.status(200).json(result)
    } catch (error) {
        next(error)
    }
  },

  async createEvent(req, res, next) {
    try {
        const organizerId = req.user.id
        const newEvent = await EventService.createEvent({
            ...req.body,
          organizerId
        })
        res.status(200).json(newEvent)
    } catch (error) {
      next(error);
    }
  },

  async updateEvent(req, res, next) {
    try {
      const eventId = parseInt(req.params.id, 10)
      const userId = req.user.id;
      const payload = req.body;
      const result = await EventService.updateEvent(eventId, payload, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  async deleteEvent(req, res, next) {
    try {
      const userId = req.user.id;
      const eventId = parseInt(req.params.id, 10)
      const result = await EventService.deleteEvent(eventId, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
};
