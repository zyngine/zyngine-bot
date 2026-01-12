'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import TicketPanelBuilder from '@/components/TicketPanelBuilder';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import StaffLeaderboard from '@/components/StaffLeaderboard';
import SLAConfiguration from '@/components/SLAConfiguration';
import CannedResponses from '@/components/CannedResponses';
import TagsManager from '@/components/TagsManager';
import BlacklistManager from '@/components/BlacklistManager';
import AuditLogs from '@/components/AuditLogs';
import TicketSearch from '@/components/TicketSearch';

export default function GuildDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [guild, setGuild] = useState(null);
  const [guildInfo, setGuildInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketPanels, setTicketPanels] = useState([]);
  const [discordRoles, setDiscordRoles] = useState([]);
  const [discordChannels, setDiscordChannels] = useState([]);
  const [discordCategories, setDiscordCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [showAddAutoRole, setShowAddAutoRole] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [editingAutoRole, setEditingAutoRole] = useState(null);
  const [showPanelBuilder, setShowPanelBuilder] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [ticketSubTab, setTicketSubTab] = useState('overview');

  // Form states
  const [newAutoRole, setNewAutoRole] = useState({
    roleId: '',
    delay: 0,
    minAccountAge: 0,
    ignoreBots: true,
    enabled: true
  });

  const [newTier, setNewTier] = useState({
    name: '',
    level: 1,
    color: '#5865F2',
    roles: [],
    approverRoles: [],
    requirements: { minMessages: 0, minAccountAge: 0, minServerAge: 0, requiredRoles: [] }
  });

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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

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

      // Fetch settings
      const settingsRes = await fetch(`/api/guilds/${params.guildId}/settings`);
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }

      // Fetch pending requests
      const requestsRes = await fetch(`/api/guilds/${params.guildId}/requests?status=pending`);
      if (requestsRes.ok) {
        setRequests(await requestsRes.json());
      }

      // Fetch Discord roles
      const rolesRes = await fetch(`/api/discord/guilds/${params.guildId}/roles`);
      if (rolesRes.ok) {
        setDiscordRoles(await rolesRes.json());
      }

      // Fetch Discord channels
      const channelsRes = await fetch(`/api/discord/guilds/${params.guildId}/channels`);
      if (channelsRes.ok) {
        setDiscordChannels(await channelsRes.json());
      }

      // Fetch tickets
      const ticketsRes = await fetch(`/api/guilds/${params.guildId}/tickets`);
      if (ticketsRes.ok) {
        setTickets(await ticketsRes.json());
      }

      // Fetch ticket panels
      const panelsRes = await fetch(`/api/guilds/${params.guildId}/ticket-panels`);
      if (panelsRes.ok) {
        setTicketPanels(await panelsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request actions
  const handleRequestAction = async (requestId, action, reason = '') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${params.guildId}/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });

      if (res.ok) {
        setRequests(requests.filter(r => r._id !== requestId));
        showMessage('success', `Request ${action}d successfully`);
      } else {
        showMessage('error', 'Failed to update request');
      }
    } catch (error) {
      showMessage('error', 'Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  // Auto-role actions
  const handleAddAutoRole = async () => {
    if (!newAutoRole.roleId) {
      showMessage('error', 'Please select a role');
      return;
    }

    setSaving(true);
    try {
      const role = discordRoles.find(r => r.id === newAutoRole.roleId);
      const res = await fetch(`/api/guilds/${params.guildId}/autoroles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAutoRole,
          roleName: role?.name || newAutoRole.roleId
        })
      });

      if (res.ok) {
        const updatedAutoRoles = await res.json();
        setGuild({ ...guild, autoRoles: updatedAutoRoles });
        setShowAddAutoRole(false);
        setNewAutoRole({ roleId: '', delay: 0, minAccountAge: 0, ignoreBots: true, enabled: true });
        showMessage('success', 'Auto-role added');
      } else {
        showMessage('error', 'Failed to add auto-role');
      }
    } catch (error) {
      showMessage('error', 'Failed to add auto-role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAutoRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this auto-role?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${params.guildId}/autoroles/${roleId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const updatedAutoRoles = await res.json();
        setGuild({ ...guild, autoRoles: updatedAutoRoles });
        showMessage('success', 'Auto-role deleted');
      } else {
        showMessage('error', 'Failed to delete auto-role');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete auto-role');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoRole = async (roleId, enabled) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${params.guildId}/autoroles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (res.ok) {
        const updatedAutoRoles = await res.json();
        setGuild({ ...guild, autoRoles: updatedAutoRoles });
      }
    } catch (error) {
      showMessage('error', 'Failed to update auto-role');
    } finally {
      setSaving(false);
    }
  };

  // Settings actions
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${params.guildId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        showMessage('success', 'Settings saved');
      } else {
        showMessage('error', 'Failed to save settings');
      }
    } catch (error) {
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Add tier
  const handleAddTier = async () => {
    if (!newTier.name) {
      showMessage('error', 'Please enter a tier name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${params.guildId}/tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTier)
      });

      if (res.ok) {
        const updatedTiers = await res.json();
        setGuild({ ...guild, roleTiers: updatedTiers });
        setShowAddTier(false);
        setNewTier({
          name: '',
          level: 1,
          color: '#5865F2',
          roles: [],
          approverRoles: [],
          requirements: { minMessages: 0, minAccountAge: 0, minServerAge: 0, requiredRoles: [] }
        });
        showMessage('success', 'Tier added');
      } else {
        showMessage('error', 'Failed to add tier');
      }
    } catch (error) {
      showMessage('error', 'Failed to add tier');
    } finally {
      setSaving(false);
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

      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-20 right-4 px-6 py-3 rounded-lg z-50 ${
          message.type === 'success' ? 'bg-discord-green' : 'bg-discord-red'
        }`}>
          {message.text}
        </div>
      )}

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
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'tickets', label: 'Tickets' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'staff', label: 'Staff' },
            { id: 'auto-roles', label: 'Auto Roles' },
            { id: 'tiers', label: 'Tiers' },
            { id: 'requests', label: 'Requests' },
            { id: 'tools', label: 'Tools' },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-discord-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Open Tickets</h3>
                <p className="text-3xl font-bold text-discord-green">
                  {tickets.filter(t => t.status === 'open').length}
                </p>
              </div>
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Total Tickets</h3>
                <p className="text-3xl font-bold">{tickets.length}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Ticket Panels</h3>
                <p className="text-3xl font-bold">{ticketPanels.length}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Pending Requests</h3>
                <p className="text-3xl font-bold">{requests.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Auto Roles</h3>
                <p className="text-3xl font-bold">{guild?.autoRoles?.length || 0}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Role Tiers</h3>
                <p className="text-3xl font-bold">{guild?.roleTiers?.length || 0}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-400 text-sm mb-1">Discord Roles</h3>
                <p className="text-3xl font-bold">{discordRoles.length}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setActiveTab('tickets'); setTicketSubTab('panels'); }}
                  className="btn-primary"
                >
                  Manage Panels
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
                >
                  View Analytics
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
                >
                  Staff Leaderboard
                </button>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Recent Tickets</h3>
              {tickets.slice(0, 5).length > 0 ? (
                <div className="space-y-2">
                  {tickets.slice(0, 5).map(ticket => (
                    <div key={ticket._id} className="flex items-center justify-between bg-discord-dark p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="font-medium">#{ticket.ticketNumber}</span>
                        <span className="text-gray-400 text-sm">{ticket.username}</span>
                        {ticket.category && <span className="text-gray-500 text-xs">{ticket.category}</span>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No tickets yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard guildId={params.guildId} />
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <StaffLeaderboard guildId={params.guildId} />
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            {/* Tools Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-3 overflow-x-auto">
              {[
                { id: 'canned', label: 'Canned Responses' },
                { id: 'tags', label: 'Tags' },
                { id: 'sla', label: 'SLA Config' },
                { id: 'blacklist', label: 'Blacklist' },
                { id: 'audit', label: 'Audit Logs' },
                { id: 'search', label: 'Search' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTicketSubTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    ticketSubTab === tab.id
                      ? 'bg-discord-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {ticketSubTab === 'canned' && (
              <CannedResponses guildId={params.guildId} onMessage={showMessage} />
            )}

            {ticketSubTab === 'tags' && (
              <TagsManager guildId={params.guildId} onMessage={showMessage} />
            )}

            {ticketSubTab === 'sla' && (
              <SLAConfiguration guildId={params.guildId} onMessage={showMessage} />
            )}

            {ticketSubTab === 'blacklist' && (
              <BlacklistManager guildId={params.guildId} onMessage={showMessage} />
            )}

            {ticketSubTab === 'audit' && (
              <AuditLogs guildId={params.guildId} />
            )}

            {ticketSubTab === 'search' && (
              <TicketSearch guildId={params.guildId} onMessage={showMessage} />
            )}
          </div>
        )}

        {/* Auto-Roles Tab */}
        {activeTab === 'auto-roles' && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Auto Roles</h2>
              <button
                onClick={() => setShowAddAutoRole(true)}
                className="btn-primary"
              >
                + Add Auto Role
              </button>
            </div>

            {guild?.autoRoles?.length > 0 ? (
              <div className="space-y-3">
                {guild.autoRoles.map((role, index) => (
                  <div key={index} className="flex items-center justify-between bg-discord-dark p-4 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{role.roleName || role.roleId}</p>
                      <p className="text-sm text-gray-400">
                        Delay: {role.delay}s | Min Account Age: {role.minAccountAge} days
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAutoRole(role.roleId, !role.enabled)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          role.enabled
                            ? 'bg-discord-green/20 text-discord-green'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {role.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleDeleteAutoRole(role.roleId)}
                        className="text-discord-red hover:bg-discord-red/20 p-2 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No auto roles configured.</p>
            )}

            {/* Add Auto Role Modal */}
            {showAddAutoRole && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md">
                  <h3 className="text-xl font-semibold mb-4">Add Auto Role</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Role</label>
                      <select
                        value={newAutoRole.roleId}
                        onChange={(e) => setNewAutoRole({ ...newAutoRole, roleId: e.target.value })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      >
                        <option value="">Select a role...</option>
                        {discordRoles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Delay (seconds)</label>
                      <input
                        type="number"
                        value={newAutoRole.delay}
                        onChange={(e) => setNewAutoRole({ ...newAutoRole, delay: parseInt(e.target.value) || 0 })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min Account Age (days)</label>
                      <input
                        type="number"
                        value={newAutoRole.minAccountAge}
                        onChange={(e) => setNewAutoRole({ ...newAutoRole, minAccountAge: parseInt(e.target.value) || 0 })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newAutoRole.ignoreBots}
                        onChange={(e) => setNewAutoRole({ ...newAutoRole, ignoreBots: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <label className="text-sm text-gray-400">Ignore bots</label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddAutoRole(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAutoRole}
                      disabled={saving}
                      className="flex-1 btn-primary"
                    >
                      {saving ? 'Adding...' : 'Add Role'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === 'tiers' && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Role Tiers</h2>
              <button
                onClick={() => setShowAddTier(true)}
                className="btn-primary"
              >
                + Add Tier
              </button>
            </div>

            {guild?.roleTiers?.length > 0 ? (
              <div className="space-y-3">
                {guild.roleTiers.map((tier, index) => (
                  <div key={index} className="bg-discord-dark p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <p className="font-medium">{tier.name}</p>
                      <span className="text-sm text-gray-400">Level {tier.level}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {tier.roles?.length || 0} roles | {tier.approverRoles?.length || 0} approver roles
                    </p>
                    {tier.requirements && (
                      <p className="text-sm text-gray-500 mt-1">
                        Requirements: {tier.requirements.minMessages || 0} msgs,
                        {tier.requirements.minAccountAge || 0}d account,
                        {tier.requirements.minServerAge || 0}d in server
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No role tiers configured.</p>
            )}

            {/* Add Tier Modal */}
            {showAddTier && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-semibold mb-4">Add Role Tier</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Tier Name</label>
                      <input
                        type="text"
                        value={newTier.name}
                        onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="e.g., Basic, Premium, VIP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Level</label>
                      <input
                        type="number"
                        value={newTier.level}
                        onChange={(e) => setNewTier({ ...newTier, level: parseInt(e.target.value) || 1 })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={newTier.color}
                        onChange={(e) => setNewTier({ ...newTier, color: e.target.value })}
                        className="w-full h-10 bg-discord-dark border border-gray-600 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min Messages Required</label>
                      <input
                        type="number"
                        value={newTier.requirements.minMessages}
                        onChange={(e) => setNewTier({
                          ...newTier,
                          requirements: { ...newTier.requirements, minMessages: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min Account Age (days)</label>
                      <input
                        type="number"
                        value={newTier.requirements.minAccountAge}
                        onChange={(e) => setNewTier({
                          ...newTier,
                          requirements: { ...newTier.requirements, minAccountAge: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddTier(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTier}
                      disabled={saving}
                      className="flex-1 btn-primary"
                    >
                      {saving ? 'Adding...' : 'Add Tier'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Pending Role Requests</h2>

            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request._id} className="bg-discord-dark p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{request.username || request.userId}</p>
                        <p className="text-sm text-gray-400">
                          Requesting: <span className="text-white">{request.roleName || request.roleId}</span>
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-500 mt-1 italic">"{request.reason}"</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestAction(request._id, 'approve')}
                          disabled={saving}
                          className="bg-discord-green hover:bg-discord-green/80 px-4 py-2 rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(request._id, 'deny')}
                          disabled={saving}
                          className="bg-discord-red hover:bg-discord-red/80 px-4 py-2 rounded-lg transition"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No pending requests.</p>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-3">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'open', label: 'Open Tickets', icon: '📬' },
                { id: 'closed', label: 'Closed', icon: '📪' },
                { id: 'panels', label: 'Panels', icon: '🎛️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTicketSubTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                    ticketSubTab === tab.id
                      ? 'bg-discord-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Sub-tab */}
            {ticketSubTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card">
                    <h3 className="text-gray-400 text-sm mb-1">Open Tickets</h3>
                    <p className="text-3xl font-bold text-discord-green">
                      {tickets.filter(t => t.status === 'open').length}
                    </p>
                  </div>
                  <div className="card">
                    <h3 className="text-gray-400 text-sm mb-1">Closed Tickets</h3>
                    <p className="text-3xl font-bold">
                      {tickets.filter(t => t.status === 'closed').length}
                    </p>
                  </div>
                  <div className="card">
                    <h3 className="text-gray-400 text-sm mb-1">Total Tickets</h3>
                    <p className="text-3xl font-bold">{tickets.length}</p>
                  </div>
                  <div className="card">
                    <h3 className="text-gray-400 text-sm mb-1">Ticket Panels</h3>
                    <p className="text-3xl font-bold">{ticketPanels.length}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditingPanel(null); setShowPanelBuilder(true); }}
                      className="btn-primary"
                    >
                      + Create Panel
                    </button>
                    <button
                      onClick={() => setTicketSubTab('open')}
                      className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
                    >
                      View Open Tickets ({tickets.filter(t => t.status === 'open').length})
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Recent Tickets</h3>
                  {tickets.slice(0, 5).length > 0 ? (
                    <div className="space-y-2">
                      {tickets.slice(0, 5).map(ticket => (
                        <div key={ticket._id} className="flex items-center justify-between bg-discord-dark p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}`} />
                            <span className="font-medium">#{ticket.ticketNumber}</span>
                            <span className="text-gray-400 text-sm">{ticket.username}</span>
                            <span className="text-gray-500 text-xs">{ticket.category}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No tickets yet.</p>
                  )}
                </div>
              </>
            )}

            {/* Open Tickets Sub-tab */}
            {ticketSubTab === 'open' && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Open Tickets</h2>
                {tickets.filter(t => t.status === 'open').length > 0 ? (
                  <div className="space-y-3">
                    {tickets.filter(t => t.status === 'open').map((ticket) => (
                      <div key={ticket._id} className="bg-discord-dark p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">#{ticket.ticketNumber}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                ticket.priority === 'urgent' ? 'bg-discord-red/20 text-discord-red' :
                                ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                ticket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {ticket.priority}
                              </span>
                              {ticket.claimedBy && (
                                <span className="px-2 py-0.5 rounded text-xs bg-discord-accent/20 text-discord-accent">
                                  Claimed by {ticket.claimedByUsername}
                                </span>
                              )}
                              {ticket.category && (
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-300">
                                  {ticket.category}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Created by: {ticket.username || ticket.userId}
                            </p>
                            {ticket.subject && (
                              <p className="text-sm text-gray-300 mt-1">{ticket.subject}</p>
                            )}
                            {ticket.formResponses?.length > 0 && (
                              <div className="mt-2 p-2 bg-discord-darker rounded text-sm">
                                {ticket.formResponses.map((fr, i) => (
                                  <div key={i} className="mb-1">
                                    <span className="text-gray-400">{fr.label}:</span>{' '}
                                    <span className="text-gray-200">{fr.response}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(ticket.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={async () => {
                                const res = await fetch(`/api/guilds/${params.guildId}/tickets/${ticket._id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'closed' })
                                });
                                if (res.ok) {
                                  setTickets(tickets.map(t =>
                                    t._id === ticket._id ? { ...t, status: 'closed', closedAt: new Date() } : t
                                  ));
                                  showMessage('success', 'Ticket closed');
                                }
                              }}
                              className="bg-discord-red hover:bg-discord-red/80 px-3 py-1 rounded-lg text-sm transition"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                        {ticket.participants?.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-500">
                              Participants: {ticket.participants.map(p => p.username || p.userId).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No open tickets.</p>
                )}
              </div>
            )}

            {/* Closed Tickets Sub-tab */}
            {ticketSubTab === 'closed' && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Closed Tickets</h2>
                {tickets.filter(t => t.status === 'closed').length > 0 ? (
                  <div className="space-y-3">
                    {tickets.filter(t => t.status === 'closed').map((ticket) => (
                      <div key={ticket._id} className="bg-discord-dark p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{ticket.ticketNumber}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                                Closed
                              </span>
                              {ticket.feedback?.rating && (
                                <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                  {'⭐'.repeat(ticket.feedback.rating)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Created by: {ticket.username || ticket.userId}
                            </p>
                            {ticket.closeReason && (
                              <p className="text-sm text-gray-500 mt-1 italic">Reason: {ticket.closeReason}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Closed by {ticket.closedByUsername} on {new Date(ticket.closedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {ticket.transcript && (
                              <button
                                onClick={() => {
                                  const blob = new Blob([ticket.transcript], { type: 'text/html' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `ticket-${ticket.ticketNumber}-transcript.html`;
                                  a.click();
                                }}
                                className="bg-discord-accent hover:bg-discord-accent/80 px-3 py-1 rounded-lg text-sm transition"
                              >
                                Transcript
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No closed tickets.</p>
                )}
              </div>
            )}

            {/* Panels Sub-tab */}
            {ticketSubTab === 'panels' && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Ticket Panels</h2>
                  <button
                    onClick={() => { setEditingPanel(null); setShowPanelBuilder(true); }}
                    className="btn-primary"
                  >
                    + Create Panel
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  Create and manage ticket panels from the dashboard. Panels can be sent to channels to allow users to create tickets.
                </p>

                {ticketPanels.length > 0 ? (
                  <div className="space-y-3">
                    {ticketPanels.map((panel) => (
                      <div key={panel._id} className="bg-discord-dark p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{panel.name}</p>
                              {panel.style?.type && panel.style.type !== 'channel' && (
                                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                                  {panel.style.type}
                                </span>
                              )}
                            </div>
                            {panel.description && (
                              <p className="text-sm text-gray-400 mt-1">{panel.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                              <span>{panel.categories?.length || 0} categories</span>
                              <span>|</span>
                              <span>Max {panel.limits?.maxTicketsPerUser || 1} per user</span>
                              {panel.forms?.length > 0 && (
                                <>
                                  <span>|</span>
                                  <span>{panel.forms.length} form fields</span>
                                </>
                              )}
                              {panel.automations?.length > 0 && (
                                <>
                                  <span>|</span>
                                  <span>{panel.automations.length} automations</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Created {new Date(panel.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => { setEditingPanel(panel); setShowPanelBuilder(true); }}
                              className="bg-discord-accent hover:bg-discord-accent/80 px-3 py-1 rounded-lg text-sm transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Are you sure you want to delete this panel?')) return;
                                const res = await fetch(`/api/guilds/${params.guildId}/ticket-panels/${panel._id}`, {
                                  method: 'DELETE'
                                });
                                if (res.ok) {
                                  setTicketPanels(ticketPanels.filter(p => p._id !== panel._id));
                                  showMessage('success', 'Panel deleted');
                                }
                              }}
                              className="bg-discord-red hover:bg-discord-red/80 px-3 py-1 rounded-lg text-sm transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Panel categories preview */}
                        {panel.categories?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-2">Categories:</p>
                            <div className="flex flex-wrap gap-2">
                              {panel.categories.map(cat => (
                                <span key={cat.id} className="px-2 py-1 bg-discord-darker rounded text-xs">
                                  {cat.emoji} {cat.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No ticket panels configured.</p>
                    <p className="text-sm mt-1">Click "Create Panel" to set up your first ticket panel.</p>
                  </div>
                )}
              </div>
            )}

            {/* Panel Builder Modal */}
            {showPanelBuilder && (
              <TicketPanelBuilder
                panel={editingPanel}
                onSave={async (panelData) => {
                  setSaving(true);
                  try {
                    const url = editingPanel?._id
                      ? `/api/guilds/${params.guildId}/ticket-panels/${editingPanel._id}`
                      : `/api/guilds/${params.guildId}/ticket-panels`;
                    const method = editingPanel?._id ? 'PUT' : 'POST';

                    const res = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(panelData)
                    });

                    if (res.ok) {
                      const savedPanel = await res.json();
                      if (editingPanel?._id) {
                        setTicketPanels(ticketPanels.map(p => p._id === savedPanel._id ? savedPanel : p));
                      } else {
                        setTicketPanels([savedPanel, ...ticketPanels]);
                      }
                      setShowPanelBuilder(false);
                      setEditingPanel(null);
                      showMessage('success', editingPanel?._id ? 'Panel updated' : 'Panel created');
                    } else {
                      showMessage('error', 'Failed to save panel');
                    }
                  } catch (error) {
                    showMessage('error', 'Failed to save panel');
                  } finally {
                    setSaving(false);
                  }
                }}
                onCancel={() => { setShowPanelBuilder(false); setEditingPanel(null); }}
                channels={discordChannels}
                roles={discordRoles}
                categories={discordCategories}
                allPanels={ticketPanels}
                saving={saving}
              />
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Server Settings</h2>

            <div className="space-y-6">
              {/* Request Cooldown */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Request Cooldown (seconds)</label>
                <input
                  type="number"
                  value={settings.requestCooldown || 3600}
                  onChange={(e) => setSettings({ ...settings, requestCooldown: parseInt(e.target.value) || 3600 })}
                  className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full max-w-xs"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">How long users must wait between role requests</p>
              </div>

              {/* Notification Channel */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Request Notification Channel</label>
                <select
                  value={settings.notifications?.requestChannelId || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, requestChannelId: e.target.value }
                  })}
                  className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full max-w-md"
                >
                  <option value="">None</option>
                  {discordChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Channel where role request notifications are sent</p>
              </div>

              {/* Log Channel */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Log Channel</label>
                <select
                  value={settings.notifications?.logChannelId || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, logChannelId: e.target.value }
                  })}
                  className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full max-w-md"
                >
                  <option value="">None</option>
                  {discordChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Channel where all role actions are logged</p>
              </div>

              {/* DM Settings */}
              <div className="space-y-3">
                <label className="block text-sm text-gray-400">DM Notifications</label>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.approvalDMEnabled !== false}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, approvalDMEnabled: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">DM users when their request is approved</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.denialDMEnabled !== false}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, denialDMEnabled: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">DM users when their request is denied</span>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.welcomeMessage?.enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      welcomeMessage: { ...settings.welcomeMessage, enabled: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">Enable Welcome Message</label>
                </div>

                {settings.welcomeMessage?.enabled && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Welcome Channel</label>
                      <select
                        value={settings.welcomeMessage?.channelId || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          welcomeMessage: { ...settings.welcomeMessage, channelId: e.target.value }
                        })}
                        className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full max-w-md"
                      >
                        <option value="">Select a channel...</option>
                        {discordChannels.map(channel => (
                          <option key={channel.id} value={channel.id}>#{channel.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Welcome Message</label>
                      <textarea
                        value={settings.welcomeMessage?.message || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          welcomeMessage: { ...settings.welcomeMessage, message: e.target.value }
                        })}
                        className="bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 w-full"
                        rows={3}
                        placeholder="Welcome to {server}! You have been assigned the {roles} role(s)."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Variables: {'{server}'}, {'{user}'}, {'{roles}'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="border-t border-gray-700 pt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn-primary px-8"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
