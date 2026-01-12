'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function GuildDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [guild, setGuild] = useState(null);
  const [guildInfo, setGuildInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.accessToken && params.guildId) {
      fetchData();
    }
  }, [session, params.guildId]);

  const fetchData = async () => {
    try {
      // Fetch guild info from Discord
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const guilds = await guildsRes.json();
      const currentGuild = guilds.find(g => g.id === params.guildId);
      setGuildInfo(currentGuild);

      // Fetch guild config from our API
      const configRes = await fetch(`/api/guilds/${params.guildId}`);
      if (configRes.ok) {
        const config = await configRes.json();
        setGuild(config);
      }

      // Fetch pending requests
      const requestsRes = await fetch(`/api/guilds/${params.guildId}/requests?status=pending`);
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-discord-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {guildInfo?.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.png`}
              alt={guildInfo.name}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-discord-accent flex items-center justify-center text-3xl font-bold">
              {guildInfo?.name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{guildInfo?.name || 'Unknown Server'}</h1>
            <p className="text-gray-400">Server ID: {params.guildId}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
          {['overview', 'auto-roles', 'requests', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                activeTab === tab
                  ? 'bg-discord-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-gray-400 text-sm mb-1">Auto Roles</h3>
              <p className="text-3xl font-bold">{guild?.autoRoles?.length || 0}</p>
            </div>
            <div className="card">
              <h3 className="text-gray-400 text-sm mb-1">Pending Requests</h3>
              <p className="text-3xl font-bold">{requests.length}</p>
            </div>
            <div className="card">
              <h3 className="text-gray-400 text-sm mb-1">Role Tiers</h3>
              <p className="text-3xl font-bold">{guild?.roleTiers?.length || 0}</p>
            </div>
          </div>
        )}

        {activeTab === 'auto-roles' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Auto Roles</h2>
            {guild?.autoRoles?.length > 0 ? (
              <div className="space-y-3">
                {guild.autoRoles.map((role, index) => (
                  <div key={index} className="flex items-center justify-between bg-discord-dark p-4 rounded-lg">
                    <div>
                      <p className="font-medium">{role.roleName || role.roleId}</p>
                      <p className="text-sm text-gray-400">
                        Delay: {role.delay}s | Min Account Age: {role.minAccountAge}d
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${role.enabled ? 'bg-discord-green/20 text-discord-green' : 'bg-gray-600 text-gray-300'}`}>
                      {role.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No auto roles configured. Use /setup-autorole in Discord to add some.</p>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Pending Role Requests</h2>
            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request._id} className="flex items-center justify-between bg-discord-dark p-4 rounded-lg">
                    <div>
                      <p className="font-medium">{request.username || request.userId}</p>
                      <p className="text-sm text-gray-400">
                        Requesting: {request.roleName || request.roleId}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1">"{request.reason}"</p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No pending requests.</p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Server Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Request Cooldown (seconds)</label>
                <input
                  type="number"
                  value={guild?.requestCooldown || 3600}
                  className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full max-w-xs"
                  disabled
                />
              </div>
              <p className="text-gray-500 text-sm">
                More settings coming soon. For now, use Discord commands to configure the bot.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
