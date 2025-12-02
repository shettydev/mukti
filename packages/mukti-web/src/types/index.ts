/**
 * Barrel export for type definitions
 */

// Auth types
export type {
  AuthResponse,
  ForgotPasswordDto,
  LoginDto,
  OAuthDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  Session,
  SessionsResponse,
  TokenResponse,
  VerifyEmailDto,
} from './auth.types';

// Layout types
export type {
  ComingSoonProps,
  DashboardLayoutProps,
  DashboardLayoutSkeletonProps,
  LayoutState,
  NavbarAction,
  SidebarNavItem,
  SidebarSection,
} from './layout.types';

// User types
export type { User, UserPreferences } from './user.types';

// WebSocket types
export type {
  ClientToServerEvents,
  ConnectionStatus,
  MessageProcessingEvent,
  QueuedMessage,
  ServerToClientEvents,
  TypingEvent,
  WebSocketError,
  WebSocketMessage,
} from './websocket.types';
