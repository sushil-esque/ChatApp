import { Router } from "express";
import * as authController from "../controllers/auth.controller"
const authRouter = Router();

authRouter.post("/register", authController.register);

export default authRouter;