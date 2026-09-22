export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterClientRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterProducerRequest extends RegisterClientRequest {
  farmName: string;
  countryCode: string;
}

export interface AuthResponse {
  token: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
