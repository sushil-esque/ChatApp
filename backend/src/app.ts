import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./routes/auth.routes";
import conversationRouter from "./routes/conversation.routes.js";
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationRouter);
app.use(errorHandler);
export default app;
