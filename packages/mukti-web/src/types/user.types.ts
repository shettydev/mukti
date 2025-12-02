/**
 * User type definitions for frontend
 * Based on UserResponseDto from backend
 * @property {Date} createdAt - Account creation timestamp
 * @property {string} email - User email address
 * @property {boolean} emailVerified - Whether email is verified
 * @property {string} firstName - User's first name
 * @property {string} id - Unique user identifier
 * @property {boolean} isActive - Whether account is active
 * @property {Date} [lastLoginAt] - Last login timestamp
 * @property {string} lastName - User's last name
 * @property {string} [phone] - User phone number
 * @property {'admin' | 'moderator' | 'user'} role - User role
 * @property {Date} updatedAt - Last update timestamp
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

/**
 * User preferences and settings
 * @property {string} [defaultTechnique] - Default Socratic technique preference
 * @property {boolean} [emailNotifications] - Email notification preference
 * @property {string} [language] - Preferred language
 * @property {'dark' | 'light'} [theme] - UI theme preference
 */
export interface UserPreferences {
  defaultTechnique?: string;
  emailNotifications?: boolean;
  language?: string;
  theme?: 'dark' | 'light';
}
