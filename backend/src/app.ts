import express from "express";
import authRouter from "./routes/auth.routes";
import { errorHandler } from "./middlewares/errorHandler";
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use(errorHandler)
export default app;