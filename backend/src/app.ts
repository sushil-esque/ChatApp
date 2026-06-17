import cookieParser from "cookie-parser";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./routes/auth.routes";
const app = express();
app.use(express.json());
app.use(cookieParser());  

app.use("/api/auth", authRouter);
app.use(errorHandler)
export default app;