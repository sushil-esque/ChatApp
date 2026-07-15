import api from "./client";
import type {
  RegisterPayload,
  LoginPayload,
  VerifyEmailPayload,
  ResendOtpPayload,
  AuthResponse,
  User,
} from "../types/auth.types";
import axios from "axios";

export const authApi = {
  register: (data: RegisterPayload) => api.post("/auth/register", data),
  verifyEmail: (data: VerifyEmailPayload) =>
    api.post<AuthResponse>("/auth/verifyEmail", data),
  resendOtp: (data: ResendOtpPayload) => api.post("/auth/resend-otp", data),
  login: (data: LoginPayload) => api.post<AuthResponse>("/auth/login", data),
  getMe: () => api.get<User>("/auth/me"),
  logout: () => api.post("/auth/logout"),
  refresh: () =>
    axios.get<{ accessToken: string }>(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
      {
        withCredentials: true,
      },
    ),
};
