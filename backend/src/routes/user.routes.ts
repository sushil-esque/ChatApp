import { Router } from "express";

import { authenticate } from "../middlewares/authenticate.js";
import { getMe, searchUsers, updateProfile } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", getMe);
userRouter.get("/search", searchUsers);
userRouter.put("/update", updateProfile)

export default userRouter;
