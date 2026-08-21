import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler.js";
import authRouter from "./routes/auth.routes.js";
import conversationRouter from "./routes/conversation.routes.js";
import userRouter from "./routes/user.routes.js";
import morgan from "morgan";
const app = express();
app.use(morgan("dev"));

// Dynamic CORS for different environments
const allowedOrigins = [
  "http://localhost:5173", // Local dev
  "http://localhost:3000", // Local backend
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

// Matches any *.vercel.app subdomain (glob not supported by cors pkg)
const vercelOriginRegex = /^https:\/\/[\w-]+\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) { callback(null, true); return; }
      if (allowedOrigins.includes(origin) || vercelOriginRegex.test(origin)) {
        callback(null, true); return;
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
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
