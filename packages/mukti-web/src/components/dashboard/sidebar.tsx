'use client';

import type { ReactNode } from 'react';

import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Navigation item component
 */
interface NavItemProps {
  active?: boolean;
  collapsed: boolean;
  icon: ReactNode;
  label: string;
}

interface SidebarProps {
  collapsed: boolean;
}

/**
 * Collapsible sidebar component for dashboard navigation
 *
 * Features:
 * - Smooth collapse/expand animation
 * - Organized navigation sections
 * - CTA card at bottom
 * - Responsive design
 */
export function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'bg-[#111111] border-r border-white/10 transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-semibold text-lg whitespace-nowrap">Mukti AI</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Menu
          </div>
        )}
        <NavItem
          active
          collapsed={collapsed}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Dashboard"
        />
        <NavItem
          collapsed={collapsed}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Conversations"
        />
        <NavItem collapsed={collapsed} icon={<Users className="w-4 h-4" />} label="Community" />
        <NavItem collapsed={collapsed} icon={<FileText className="w-4 h-4" />} label="Resources" />

        {!collapsed && (
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 mt-6">
            Management
          </div>
        )}
        <NavItem
          collapsed={collapsed}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Inquiry Sessions"
        />
        <NavItem collapsed={collapsed} icon={<Mail className="w-4 h-4" />} label="Messages" />
        <NavItem
          collapsed={collapsed}
          icon={<FileText className="w-4 h-4" />}
          label="Reports & Analytics"
        />

        {!collapsed && (
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 mt-6">
            Others
          </div>
        )}
        <NavItem collapsed={collapsed} icon={<Settings className="w-4 h-4" />} label="Settings" />
        <NavItem
          collapsed={collapsed}
          icon={<HelpCircle className="w-4 h-4" />}
          label="Help & Support"
        />
      </nav>

      {/* CTA Card */}
      {!collapsed && (
        <div className="p-4">
          <Card className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 border-purple-500/30 p-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Try Mukti AI</h3>
            <p className="text-xs text-white/60 mb-3">
              Make smarter, data-driven decisions with AI insights.
            </p>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white text-xs h-8">
              <Sparkles className="w-3 h-3 mr-1" />
              Get An Analysis
            </Button>
          </Card>
        </div>
      )}
    </aside>
  );
}

function NavItem({ active, collapsed, icon, label }: NavItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/5',
        collapsed && 'justify-center'
      )}
      title={collapsed ? label : undefined}
      type="button"
    >
      {icon}
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}
