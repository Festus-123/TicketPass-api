import { Router } from "express";
import { EventController } from "../controllers/eventControllers.js";
import { authMiddleware } from "../middlewares/authMidlewares.js";
import { organizerMiddleware } from "../middlewares/eventMiddleware.js";
import { validateData } from "../middlewares/validatorMiddleware.js";
import { createEventSchema, updateEventSchema } from "../schema/eventSchema.js";

const router = Router();

router.use(authMiddleware);

router.get("/", EventController.getEvents);

router.get("/:id", EventController.getEventById);

router.use(organizerMiddleware)

router.post("/", validateData(createEventSchema), EventController.createEvent);

router.patch("/:id", validateData(updateEventSchema), EventController.updateEvent);

router.delete("/:id", EventController.deleteEvent);

export default router;
