'use client';

import { ArrowRight, Mic, Paperclip, Smile, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) {
      return;
    }
    // TODO: Implement message sending logic
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

  return (
    <DashboardLayout contentClassName="p-6" title={`${getGreeting()}, ${user?.firstName} 👋`}>
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
    </DashboardLayout>
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
