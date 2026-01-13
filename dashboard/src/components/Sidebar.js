'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Users,
  Shield,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cog,
  MessageSquare,
  Gift,
  Star,
  Gavel,
  Trophy,
  Wrench,
  LogOut,
  HelpCircle,
  FileText,
  ScrollText,
} from 'lucide-react';

const menuItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: Gavel },
  { id: 'logging', label: 'Logging', icon: ScrollText, badge: 'New' },
  { id: 'leveling', label: 'Leveling', icon: Trophy },
  { id: 'auto-roles', label: 'Auto Roles', icon: Shield },
  { id: 'starboard', label: 'Starboard', icon: Star },
  { id: 'giveaways', label: 'Giveaways', icon: Gift },
  { id: 'custom-commands', label: 'Commands', icon: MessageSquare },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ guildInfo, activeTab, setActiveTab, collapsed, setCollapsed }) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar fixed left-0 top-0 h-full z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
              <Cog className="w-6 h-6 text-discord-darker gear-spin" />
            </div>
            <span className="font-bold text-lg gradient-text">Zyngine</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <Cog className="w-6 h-6 text-discord-darker gear-spin" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Server Info */}
      {guildInfo && (
        <div className={`p-4 border-b border-white/5 ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            {guildInfo.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.png`}
                alt={guildInfo.name}
                className={`rounded-xl ${collapsed ? 'w-12 h-12' : 'w-10 h-10'}`}
              />
            ) : (
              <div className={`rounded-xl bg-discord-accent flex items-center justify-center font-bold ${collapsed ? 'w-12 h-12 text-lg' : 'w-10 h-10'}`}>
                {guildInfo.name?.charAt(0) || '?'}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{guildInfo.name}</p>
                <p className="text-xs text-gray-500 truncate">Server Dashboard</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-3 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-item w-full ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? 'text-discord-accent' : ''} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-discord-accent/20 text-discord-accent">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/5">
        <Link
          href="/dashboard"
          className={`sidebar-item w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Switch Server' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Switch Server</span>}
        </Link>
        <a
          href="https://github.com/zyngine/zyngine-bot"
          target="_blank"
          rel="noopener noreferrer"
          className={`sidebar-item w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Help & Docs' : undefined}
        >
          <HelpCircle size={20} />
          {!collapsed && <span>Help & Docs</span>}
        </a>
      </div>
    </aside>
  );
}
