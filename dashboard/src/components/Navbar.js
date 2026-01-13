'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  Zap,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  User,
  Bell,
  Settings,
} from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 flex items-center justify-between border-b border-white/5" style={{ background: 'rgba(10, 10, 18, 0.8)', backdropFilter: 'blur(20px)' }}>
      <Link href="/" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold gradient-text">Zyngine</span>
      </Link>

      <div className="flex items-center gap-4">
        {session ? (
          <>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-discord-accent"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
              >
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Avatar"
                    width={36}
                    height={36}
                    className="rounded-full ring-2 ring-discord-accent/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-discord-accent flex items-center justify-center">
                    <User size={18} />
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">{session.user?.name}</p>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50 animate-scale-in" style={{ background: 'rgba(15, 15, 26, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(88, 101, 242, 0.2)' }}>
                    <div className="p-3 border-b border-white/5">
                      <p className="font-medium">{session.user?.name}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </Link>
                    </div>
                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-discord-red hover:bg-discord-red/10 transition-all"
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => signIn('discord')}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Login with Discord</span>
          </button>
        )}
      </div>
    </nav>
  );
}
