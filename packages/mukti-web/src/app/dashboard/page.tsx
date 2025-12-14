'use client';

import { ArrowRight, Brain, MessageSquare, MessageSquarePlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight-new';
import { useAuth } from '@/lib/hooks/use-auth';

/**
 * Feature card component props
 */
interface FeatureCardProps {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}

/**
 * Dashboard page with modern UI
 *
 * Features:
 * - Welcome section with personalized greeting
 * - Feature cards for quick actions
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
    <DashboardLayout
      contentClassName="p-0 relative overflow-hidden"
      title={`${getGreeting()}, ${user?.firstName} 👋`}
    >
      <div className="h-full w-full bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
        <Spotlight />
        <div className="p-6 max-w-6xl mx-auto space-y-12 relative z-10">
          {/* Welcome Section */}
          <div className="text-center space-y-6 pt-8">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                alt="Mukti AI"
                className="object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.3)]"
                fill
                priority
                src="/mukti-logo-2.png"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
                Unlock Your Potential
              </h2>
              <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
                Engage in deep Socratic dialogue to explore ideas, challenge assumptions, and
                discover solutions.
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              description="Start a new Socratic inquiry session. I'll guide you through structured questioning to help you discover your own solutions."
              href="/dashboard/conversations?openDialog=true"
              icon={<MessageSquarePlus className="w-6 h-6 text-purple-400" />}
              title="New Conversation"
            />
            <FeatureCard
              description="Continue your ongoing inquiry sessions. Review past conversations and build upon your previous insights and discoveries."
              href="/dashboard/conversations"
              icon={<MessageSquare className="w-6 h-6 text-blue-400" />}
              title="My Conversations"
            />
            <FeatureCard
              description="Map out your thoughts visually. Create nodes, connections, and explore complex problems in a spatial canvas."
              href="/dashboard/canvas"
              icon={<Brain className="w-6 h-6 text-emerald-400" />}
              title="Thinking Session"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FeatureCard({ description, href, icon, title }: FeatureCardProps) {
  return (
    <Link className="block h-full group" href={href}>
      <Card className="bg-[#111111]/50 backdrop-blur-sm border-white/10 p-6 hover:border-purple-500/30 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer h-full flex flex-col">
        <div className="mb-4 p-3 bg-white/5 w-fit rounded-xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="font-semibold mb-2 text-lg text-neutral-200">{title}</h3>
        <p className="text-sm text-neutral-400 mb-6 flex-grow leading-relaxed">{description}</p>
        <div className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 group-hover:gap-2 transition-all font-medium mt-auto">
          Try Now
          <ArrowRight className="w-4 h-4" />
        </div>
      </Card>
    </Link>
  );
}
