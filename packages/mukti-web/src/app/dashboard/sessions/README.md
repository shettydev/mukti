# Sessions Management Page

This page allows users to view and manage their active sessions across all devices.

## Features

- **View Active Sessions**: Display all active sessions with device, location, and last activity information
- **Current Session Indicator**: Highlight the current session with a special badge
- **Revoke Individual Sessions**: Remove access from specific devices
- **Logout from All Devices**: Revoke all sessions except the current one
- **Real-time Updates**: Optimistic updates with TanStack Query for instant feedback

## Requirements

Implements requirements:

- 7.1: Session listing with device and location info
- 7.2: Session revocation
- 7.3: Logout from all devices

## Components

### SessionCard

Displays individual session information including:

- Device type icon (smartphone, tablet, laptop, desktop)
- Browser and OS information
- IP address and location
- Last activity timestamp
- Session expiration time
- Revoke button (hidden for current session)

### SessionsPage

Main page component that:

- Fetches sessions using `useSessions()` hook
- Handles session revocation with optimistic updates
- Shows loading, error, and empty states
- Provides "Logout from all devices" action
- Displays security tip for users

## API Integration

Uses TanStack Query hooks from `@/lib/hooks/use-sessions`:

- `useSessions()` - Fetch all active sessions
- `useRevokeSession()` - Revoke a specific session
- `useRevokeAllSessions()` - Revoke all sessions except current

## Usage

Navigate to `/dashboard/sessions` to access the sessions management page.

## Security

- Current session cannot be revoked from this page
- Confirmation dialog before revoking all sessions
- Security tip displayed to help users identify suspicious sessions
- Optimistic updates ensure responsive UI even with slow network
