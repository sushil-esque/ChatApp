import cookieParser from "cookie-parser";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./routes/auth.routes";
import conversationRouter from './routes/conversation.routes.js'
const app = express();
app.use(express.json());
app.use(cookieParser());  

app.use("/api/auth", authRouter);
app.use('/api/conversations', conversationRouter)
app.use(errorHandler)
export default app;
