import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = Router()

const logInLimit =  rateLimit({
    windowMs: 15 *60 * 1000,
    max: 5,
    message: "Too many login attempts, try again latter"
})

router.post('/signup', AuthController.signup)
router.post('/signin',logInLimit, AuthController.signin)
router.post('/refresh', AuthController.refresh)

export default router;