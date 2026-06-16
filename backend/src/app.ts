import express from "express";
import authRouter from "./routes/auth.routes";
import { errorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";
const app = express();
app.use(express.json());
app.use(cookieParser());  

app.use("/api/auth", authRouter);
app.use(errorHandler)
export default app;