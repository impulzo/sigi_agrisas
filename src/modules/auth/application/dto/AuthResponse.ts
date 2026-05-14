export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
}
