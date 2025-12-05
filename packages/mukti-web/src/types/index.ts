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

// Canvas visualization types
export type {
  CanvasEdge,
  CanvasLegendProps,
  CanvasNode,
  CanvasNodeData,
  LayoutConfig,
  NodePanelProps,
  NodeType,
  Position,
  RootNodeData,
  RootNodeProps,
  SeedNodeData,
  SeedNodeProps,
  SoilNodeData,
  SoilNodeProps,
  ZoomControlsProps,
} from './canvas-visualization.types';

export { DEFAULT_LAYOUT, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from './canvas-visualization.types';

// Canvas types
export type {
  CanvasSession,
  CreateCanvasSessionDto,
  NodePosition,
  ProblemStructure,
} from './canvas.types';

// Dialogue types
export type {
  DialogueMessage,
  DialogueMessageMetadata,
  NodeType as DialogueNodeType,
  DialoguePagination,
  DialogueRole,
  SendMessageResponse as DialogueSendMessageResponse,
  NodeDialogue,
  PaginatedMessagesResponse,
  SendNodeMessageDto,
} from './dialogue.types';

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
