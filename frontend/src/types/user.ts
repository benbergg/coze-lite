export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
