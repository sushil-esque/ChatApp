import api from "./client";

export interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export const userApi = {
  searchUsers: (q: string) =>
    api.get<SearchUser[]>("/users/search", { params: { q } }),
  updateProfile: (data: { name?: string; oldPassword?: string; newPassword?: string }) =>
    api.put<{ message: string }>("/users/update", data),
};
