/**
 * User type definitions for frontend
 * Based on UserResponseDto from backend
 */

export interface User {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  firstName: string;
  id: string;
  isActive: boolean;
  lastLoginAt?: Date;
  lastName: string;
  phone?: string;
  role: 'admin' | 'moderator' | 'user';
  updatedAt: Date;
}

export interface UserPreferences {
  defaultTechnique?: string;
  emailNotifications?: boolean;
  language?: string;
  theme?: 'dark' | 'light';
}
