import { Router } from "express";
import { EventController } from "../controllers/eventControllers.js";
import { authMiddleware } from "../middlewares/authMidlewares.js";
import { organizerMiddleware } from "../middlewares/eventMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", EventController.getEvents);

router.get("/:id", EventController.getEventById);

router.use(organizerMiddleware)

router.post("/", EventController.createEvent);

router.patch("/:id", EventController.createEvent);

router.delete("/:id", (req, res) => {
  res.send("Hi you are deleting a route");
});

export default router;
