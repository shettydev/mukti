/**
 * Session card component
 * Displays individual session information with revoke action
 *
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  Laptop,
  Loader2,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';

import type { Session } from '@/types/auth.types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  isRevoking?: boolean;
  onRevoke: (sessionId: string) => void;
  session: Session;
}

/**
 * Session card component
 *
 */
export function SessionCard({ isRevoking = false, onRevoke, session }: SessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.userAgent);
  const deviceInfo = session.deviceInfo || parseDeviceInfo(session.userAgent);
  const lastActivity = formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true });

  return (
    <Card className={cn('transition-all', session.isCurrent && 'border-primary')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'rounded-lg p-2',
                session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <DeviceIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{deviceInfo}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 text-sm">
                {session.isCurrent ? (
                  <span className="flex items-center gap-1 text-primary">
                    <CheckCircle className="h-3 w-3" />
                    Current session
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Active
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          {!session.isCurrent && (
            <Button
              disabled={isRevoking}
              onClick={() => onRevoke(session.id)}
              size="sm"
              variant="ghost"
            >
              {isRevoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="sr-only">Revoke session</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{session.location || session.ipAddress}</span>
        </div>

        <div className="text-muted-foreground">
          <span>Last activity: {lastActivity}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          <span>
            Expires {formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Get device icon based on user agent
 */
function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone;
  }

  if (ua.includes('tablet') || ua.includes('ipad')) {
    return Tablet;
  }

  if (ua.includes('mac') || ua.includes('macintosh')) {
    return Laptop;
  }

  return Monitor;
}

/**
 * Parse device info from user agent
 */
function parseDeviceInfo(userAgent: string): string {
  // Extract browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  }

  // Extract OS
  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
    os = 'iOS';
  }

  return `${browser} on ${os}`;
}
