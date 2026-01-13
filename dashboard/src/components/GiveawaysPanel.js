'use client';

import { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Users,
  Hash,
  Save,
  Play,
  Square,
  Trophy,
  RefreshCw,
  Calendar,
  X
} from 'lucide-react';

export default function GiveawaysPanel({ guildId, channels, roles, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [giveaways, setGiveaways] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('active');

  const [newGiveaway, setNewGiveaway] = useState({
    prize: '',
    description: '',
    channelId: '',
    duration: 86400000, // 24 hours
    winners: 1,
    requiredRoles: [],
    bonusEntries: []
  });

  useEffect(() => {
    fetchGiveaways();
  }, [guildId]);

  const fetchGiveaways = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways`);
      if (res.ok) {
        setGiveaways(await res.json());
      }
    } catch (error) {
      console.error('Error fetching giveaways:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGiveaway = async () => {
    if (!newGiveaway.prize || !newGiveaway.channelId) {
      onMessage('error', 'Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGiveaway)
      });

      if (res.ok) {
        const giveaway = await res.json();
        setGiveaways([giveaway, ...giveaways]);
        setShowCreate(false);
        setNewGiveaway({
          prize: '',
          description: '',
          channelId: '',
          duration: 86400000,
          winners: 1,
          requiredRoles: [],
          bonusEntries: []
        });
        onMessage('success', 'Giveaway created! Use /giveaway start in Discord to begin');
      } else {
        onMessage('error', 'Failed to create giveaway');
      }
    } catch (error) {
      onMessage('error', 'Failed to create giveaway');
    } finally {
      setSaving(false);
    }
  };

  const endGiveaway = async (giveawayId) => {
    if (!confirm('Are you sure you want to end this giveaway early?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${giveawayId}/end`, {
        method: 'POST'
      });

      if (res.ok) {
        fetchGiveaways();
        onMessage('success', 'Giveaway ended! Winners will be selected');
      } else {
        onMessage('error', 'Failed to end giveaway');
      }
    } catch (error) {
      onMessage('error', 'Failed to end giveaway');
    }
  };

  const rerollGiveaway = async (giveawayId) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${giveawayId}/reroll`, {
        method: 'POST'
      });

      if (res.ok) {
        fetchGiveaways();
        onMessage('success', 'Giveaway rerolled!');
      } else {
        onMessage('error', 'Failed to reroll giveaway');
      }
    } catch (error) {
      onMessage('error', 'Failed to reroll giveaway');
    }
  };

  const deleteGiveaway = async (giveawayId) => {
    if (!confirm('Are you sure you want to delete this giveaway?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${giveawayId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setGiveaways(giveaways.filter(g => g._id !== giveawayId));
        onMessage('success', 'Giveaway deleted');
      } else {
        onMessage('error', 'Failed to delete giveaway');
      }
    } catch (error) {
      onMessage('error', 'Failed to delete giveaway');
    }
  };

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const formatTimeLeft = (endsAt) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const filteredGiveaways = giveaways.filter(g => {
    if (filter === 'active') return g.status === 'active' || g.status === 'pending';
    if (filter === 'ended') return g.status === 'ended';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full border-4 border-discord-accent/20 border-t-discord-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-discord-pink" />
            Giveaways
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Create and manage giveaways for your server
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Create Giveaway
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'active', label: 'Active' },
          { id: 'ended', label: 'Ended' },
          { id: 'all', label: 'All' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              filter === f.id
                ? 'bg-discord-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={fetchGiveaways}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Giveaways List */}
      {filteredGiveaways.length > 0 ? (
        <div className="grid gap-4">
          {filteredGiveaways.map(giveaway => (
            <div key={giveaway._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className={`w-5 h-5 ${
                      giveaway.status === 'active' ? 'text-discord-green' :
                      giveaway.status === 'pending' ? 'text-yellow-400' :
                      'text-gray-500'
                    }`} />
                    <h3 className="text-lg font-semibold">{giveaway.prize}</h3>
                    <span className={`badge ${
                      giveaway.status === 'active' ? 'badge-success' :
                      giveaway.status === 'pending' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {giveaway.status}
                    </span>
                  </div>

                  {giveaway.description && (
                    <p className="text-gray-400 text-sm mb-3">{giveaway.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Hash size={14} />
                      {channels.find(c => c.id === giveaway.channelId)?.name || 'Unknown channel'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={14} />
                      {giveaway.winners} winner{giveaway.winners > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {giveaway.entries?.length || 0} entries
                    </span>
                    {giveaway.status === 'active' && giveaway.endsAt && (
                      <span className="flex items-center gap-1 text-discord-green">
                        <Clock size={14} />
                        {formatTimeLeft(giveaway.endsAt)}
                      </span>
                    )}
                  </div>

                  {/* Winners */}
                  {giveaway.status === 'ended' && giveaway.winnerIds?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">Winners:</p>
                      <div className="flex flex-wrap gap-2">
                        {giveaway.winnerIds.map((winnerId, i) => (
                          <span key={i} className="badge badge-success">
                            {giveaway.winnerUsernames?.[i] || winnerId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {giveaway.status === 'active' && (
                    <button
                      onClick={() => endGiveaway(giveaway._id)}
                      className="btn-danger flex items-center gap-1 text-sm"
                    >
                      <Square size={14} />
                      End
                    </button>
                  )}
                  {giveaway.status === 'ended' && (
                    <button
                      onClick={() => rerollGiveaway(giveaway._id)}
                      className="btn-secondary flex items-center gap-1 text-sm"
                    >
                      <RefreshCw size={14} />
                      Reroll
                    </button>
                  )}
                  <button
                    onClick={() => deleteGiveaway(giveaway._id)}
                    className="text-discord-red hover:bg-discord-red/20 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Gift className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">No giveaways yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            Create Your First Giveaway
          </button>
        </div>
      )}

      {/* Create Giveaway Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-discord-darker rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Create Giveaway</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Prize *</label>
                <input
                  type="text"
                  value={newGiveaway.prize}
                  onChange={(e) => setNewGiveaway({ ...newGiveaway, prize: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  placeholder="e.g., Discord Nitro"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={newGiveaway.description}
                  onChange={(e) => setNewGiveaway({ ...newGiveaway, description: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Channel *</label>
                <select
                  value={newGiveaway.channelId}
                  onChange={(e) => setNewGiveaway({ ...newGiveaway, channelId: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duration</label>
                  <select
                    value={newGiveaway.duration}
                    onChange={(e) => setNewGiveaway({ ...newGiveaway, duration: parseInt(e.target.value) })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value={3600000}>1 hour</option>
                    <option value={21600000}>6 hours</option>
                    <option value={43200000}>12 hours</option>
                    <option value={86400000}>1 day</option>
                    <option value={259200000}>3 days</option>
                    <option value={604800000}>1 week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Winners</label>
                  <input
                    type="number"
                    value={newGiveaway.winners}
                    onChange={(e) => setNewGiveaway({ ...newGiveaway, winners: parseInt(e.target.value) || 1 })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Required Roles (optional)</label>
                <select
                  multiple
                  value={newGiveaway.requiredRoles}
                  onChange={(e) => setNewGiveaway({
                    ...newGiveaway,
                    requiredRoles: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 min-h-[80px]"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Users must have these roles to enter</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createGiveaway}
                disabled={saving}
                className="flex-1 btn-primary"
              >
                {saving ? 'Creating...' : 'Create Giveaway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
