import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (res) => {
    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    // skip refresh logic if the failing request IS the refresh endpoint
    if (originalRequest.url?.includes("/auth/refresh")) {
      console.log("refresh request failed", error?.response);
      return Promise.reject(error.response || error);
    }
    // if access token expired and we haven't already retried
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // a guard for an infinite loop that could be caused by 401
      try {
        // call refresh endpoint — browser sends refreshToken cookie automatically
        const { data } = await axios.get(`${BASE_URL}/auth/refresh`, {
          withCredentials: true,
        });
        setAccessToken(data.accessToken);
        // retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // refresh token also expired — force login
        setAccessToken(null);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    // session revoked or token invalid — force login immediately
    if (
      error.response?.status === 401 &&
      (error.response?.data?.code === "SESSION_REVOKED" ||
        error.response?.data?.code === "TOKEN_INVALID" ||
        error.response?.data?.code === "TOKEN_MISSING")
    ) {
      setAccessToken(null);
      window.location.href = "/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export const getAccessToken = () => accessToken;

export default api;
