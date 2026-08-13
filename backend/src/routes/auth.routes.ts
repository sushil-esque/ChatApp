import { Router } from "express";

import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
const authRouter = Router();

authRouter.post("/register", authController.register);

authRouter.post("/verifyEmail", authController.verifyEmail);

authRouter.post("/resend-otp", authController.resendOtp);

authRouter.get("/refresh", authController.refresh);

authRouter.post("/login", authController.login);

authRouter.get("/me", authenticate, authController.getMe);
authRouter.post("/logout", authenticate, authController.logout);
authRouter.post("/logout-all", authenticate, authController.logoutAll);

export default authRouter;
