export type Role = 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Manager'
};

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface UpdateUserRequest {
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
}
