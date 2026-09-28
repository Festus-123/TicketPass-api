import { AuthService } from "../services/authService.js"

export const AuthController = {
    async signup(req, res, next) {
        try {
            const { name, email, password, role } = req.body;
            const result = await AuthService.signup(name, email, password, role)
            res.status(200).json(result);
        } catch (error) {
            next(error)
        }
    },

    async signin(req, res, next) {
        try {
            const {email, password} = req.body;
            const result = await AuthService.signin(email, password)
            res.status(200).json(result);
        } catch (error) {
            next(error)
        }
    },

    async refresh(req, res, next) {
        try {
            const { refreshToken} = req.body;
            const result = await AuthService.refreshToken(refreshToken)
            res.status(200).json(result);
        } catch (error) {
            next(error)
        }
    }

}
