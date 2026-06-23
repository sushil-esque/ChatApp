export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface VerifyEmailPayload {
  email: string
  otp: string
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  verified: boolean
  role: 'USER' | 'ADMIN'
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}