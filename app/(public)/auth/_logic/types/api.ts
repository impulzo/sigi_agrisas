export interface LoginPayload {
  email: string;
  password: string;
}

export interface SetPasswordPayload {
  token: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}
