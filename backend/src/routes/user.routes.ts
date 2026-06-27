import { Router } from "express";

import { authenticate } from "../middlewares/authenticate.js";
import { getMe, searchUsers } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", getMe);
userRouter.get("/search", searchUsers);

export default userRouter;
