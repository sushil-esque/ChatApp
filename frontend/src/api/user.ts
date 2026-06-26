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
};
