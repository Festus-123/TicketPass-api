import { Router } from "express";
import { AuthController } from "../controllers/authController.js";

const router = Router()

router.post('/signup', AuthController.signup)
router.post('/signin', AuthController.signin)
router.post('/refresh', AuthController.refresh)

export default router;