'use client';

import {
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Mic,
  Paperclip,
  Smile,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/use-auth';

/**
 * Feature card component
 */
interface FeatureCardProps {
  description: string;
  title: string;
}

/**
 * Dashboard page with modern UI
 *
 * Features:
 * - Collapsible sidebar navigation
 * - Welcome section with personalized greeting
 * - Feature cards for quick actions
 * - Chat interface for Socratic inquiry
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

/**
 * Dashboard content component
 */
function DashboardContent() {
  const { isLoading, logout, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    logout();
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      return;
    }
    // TODO: Implement message sending logic
    console.log('Sending message:', message);
    setMessage('');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    }
    if (hour < 18) {
      return 'Good Afternoon';
    }
    return 'Good Evening';
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="icon"
              variant="ghost"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </Button>
            <h1 className="text-xl font-semibold">
              {getGreeting()}, {user?.firstName} 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button size="icon" variant="ghost">
              <Bell className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost">
              <Mail className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-semibold">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-white/60">{user?.email}</div>
              </div>
            </div>
            <Button onClick={handleLogout} size="icon" variant="ghost">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-2">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold">Hi, There 👋</h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Choose a prompt below or write your own to start chatting with Mukti AI.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <FeatureCard
                description="Start a new Socratic inquiry session. I'll guide you through structured questioning to help you discover your own solutions."
                title="New Conversation"
              />
              <FeatureCard
                description="Continue your ongoing inquiry sessions. Review past conversations and build upon your previous insights and discoveries."
                title="My Conversations"
              />
              <FeatureCard
                description="Explore different Socratic techniques like Elenchus, Maieutics, and Dialectic to deepen your critical thinking skills."
                title="Inquiry Methods"
              />
            </div>

            {/* Chat Input */}
            <Card className="bg-[#111111] border-white/10 p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    className="min-h-[100px] bg-transparent border-white/10 text-white placeholder:text-white/40 resize-none pr-12"
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask anything..."
                    value={message}
                  />
                  <div className="absolute bottom-3 left-3 text-xs text-white/40">
                    {message.length}/240
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                    disabled={!message.trim()}
                    onClick={handleSendMessage}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Dashboard skeleton loader
 */
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <aside className="w-64 bg-[#111111] border-r border-white/10 p-6">
        <Skeleton className="h-8 w-32 mb-8 bg-white/10" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton className="h-10 w-full bg-white/10" key={i} />
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="bg-[#111111] border-b border-white/10 px-6 py-4">
          <Skeleton className="h-8 w-64 bg-white/10" />
        </header>
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-2xl mx-auto bg-white/10" />
              <Skeleton className="h-10 w-64 mx-auto bg-white/10" />
              <Skeleton className="h-6 w-96 mx-auto bg-white/10" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton className="h-48 bg-white/10" key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ description, title }: FeatureCardProps) {
  return (
    <Card className="bg-[#111111] border-white/10 p-6 hover:border-purple-500/30 transition-colors group cursor-pointer">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-white/60 mb-4">{description}</p>
      <button
        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 group-hover:gap-2 transition-all"
        type="button"
      >
        Try Now
        <ArrowRight className="w-4 h-4" />
      </button>
    </Card>
  );
}
