'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Zap,
  Shield,
  Ticket,
  Sparkles,
  Trophy,
  Gavel,
  Star,
  Gift,
  MessageSquare,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Github,
} from 'lucide-react';

const features = [
  {
    icon: Ticket,
    title: 'Ticket System',
    description: 'Advanced ticket management with categories, forms, claiming, transcripts, and priority levels.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'AI Welcomes',
    description: 'Unique celebrity-style greetings powered by AI for every new member.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Auto Roles',
    description: 'Automatically assign roles when members join with delays and requirements.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Gavel,
    title: 'Moderation',
    description: 'Complete moderation suite with warnings, kicks, bans, mutes, and case logging.',
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: Trophy,
    title: 'Leveling System',
    description: 'XP-based leveling with role rewards and customizable progression.',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Star,
    title: 'Starboard',
    description: 'Highlight the best messages when they receive enough reactions.',
    color: 'from-amber-500 to-yellow-500',
  },
  {
    icon: Gift,
    title: 'Giveaways',
    description: 'Host giveaways with requirements, multiple winners, and automatic draws.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: MessageSquare,
    title: 'Custom Commands',
    description: 'Create server-specific commands with variables and embeds.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Detailed analytics for tickets, staff performance, and server activity.',
    color: 'from-cyan-500 to-blue-500',
  },
];

const stats = [
  { value: '10K+', label: 'Servers' },
  { value: '1M+', label: 'Users' },
  { value: '500K+', label: 'Tickets' },
  { value: '99.9%', label: 'Uptime' },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-discord-accent/20 border-t-discord-accent animate-spin"></div>
          <Zap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-discord-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-discord-accent/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-discord-accent/10 border border-discord-accent/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-discord-accent" />
            <span className="text-sm text-discord-accent">Now with AI-powered welcomes</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">Zyngine Bot</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The all-in-one Discord bot for ticket management, moderation, leveling, and community engagement.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => signIn('discord')}
              className="btn-primary flex items-center gap-3 text-lg px-8 py-4"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Open Dashboard
            </button>
            <a
              href="https://discord.com/oauth2/authorize?client_id=1450641481512783882&permissions=8&scope=bot%20applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success flex items-center gap-3 text-lg px-8 py-4"
            >
              Add to Server
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Packed with features to help you manage and grow your Discord community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card group cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Choose Zyngine?</h2>
              <div className="space-y-4">
                {[
                  'Easy web dashboard - no commands needed',
                  'AI-powered welcome messages',
                  'Comprehensive ticket system',
                  'Detailed analytics and insights',
                  'Active development and support',
                  '99.9% uptime guarantee',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-discord-green flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => signIn('discord')}
                className="btn-primary mt-8 flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <div className="card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Zyngine Bot</p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                  <span className="ml-auto status-dot status-online"></span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-discord-lighter rounded-full w-full"></div>
                  <div className="h-3 bg-discord-lighter rounded-full w-3/4"></div>
                  <div className="h-3 bg-discord-lighter rounded-full w-5/6"></div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-discord-accent/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-discord-accent/10 to-purple-500/10"></div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Level Up Your Server?</h2>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of servers already using Zyngine to manage their communities.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a
                  href="https://discord.com/oauth2/authorize?client_id=1450641481512783882&permissions=8&scope=bot%20applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
                >
                  <Zap className="w-5 h-5" />
                  Add Zyngine to Your Server
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Zyngine</span>
          </div>
          <p className="text-gray-500 text-sm">
            Made with Claude AI assistance
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/zyngine/zyngine-bot"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
