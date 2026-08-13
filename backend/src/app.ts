import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./routes/auth.routes";
import conversationRouter from "./routes/conversation.routes.js";
import userRouter from "./routes/user.routes.js";
import morgan from "morgan";
const app = express();
app.use(morgan("dev"));

// Dynamic CORS for different environments
const getAllowedOrigins = () => {
  const baseOrigins = [
    "http://localhost:5173", // Local dev
    "http://localhost:3000", // Local backend
  ];

  // Add production URLs from environment
  if (process.env.FRONTEND_URL) {
    baseOrigins.push(process.env.FRONTEND_URL);
  }

  // Always allow Vercel frontend
  if (process.env.NODE_ENV === "production") {
    baseOrigins.push("https://*.vercel.app"); // Vercel wildcard
  }

  return baseOrigins;
};
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("/{*path}", cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/users", userRouter);
app.use(errorHandler);
export default app;
