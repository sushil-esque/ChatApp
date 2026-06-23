import api from "./client";
import type {
  RegisterPayload,
  LoginPayload,
  VerifyEmailPayload,
  AuthResponse,
  User,
} from "../types/auth.types";
import axios from "axios";

export const authApi = {
  register: (data: RegisterPayload) => api.post("/auth/register", data),
  verifyEmail: (data: VerifyEmailPayload) =>
    api.post<AuthResponse>("/auth/verifyEmail", data),
  login: (data: LoginPayload) => api.post<AuthResponse>("/auth/login", data),
  getMe: () => api.get<User>("/auth/me"),
  logout: () => api.post("/auth/logout"),
  refresh: () =>
    axios.get<{ accessToken: string }>(
      "http://localhost:3000/api/auth/refresh",
      { withCredentials: true },
    ),
};
