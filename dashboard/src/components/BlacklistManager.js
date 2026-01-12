'use client';

import { useState, useEffect } from 'react';

export default function BlacklistManager({ guildId, onMessage }) {
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    odId: '',
    odUsername: '',
    reason: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchBlacklist();
  }, [guildId, pagination.page]);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/blacklist?page=${pagination.page}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.odId) {
      onMessage?.('error', 'Please enter a user ID');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        const newEntry = await res.json();
        setEntries([newEntry, ...entries]);
        setShowModal(false);
        setForm({ odId: '', odUsername: '', reason: '', expiresAt: '' });
        onMessage?.('success', 'User added to blacklist');
      } else {
        const error = await res.json();
        onMessage?.('error', error.error || 'Failed to add to blacklist');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to add to blacklist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (odId) => {
    if (!confirm('Are you sure you want to remove this user from the blacklist?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/blacklist?odId=${odId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setEntries(entries.filter(e => e.odId !== odId));
        onMessage?.('success', 'User removed from blacklist');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to remove from blacklist');
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.odUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.odId?.includes(searchQuery)
  );

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Blacklist Management</h2>
          <p className="text-sm text-gray-400">Block users from creating tickets</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add User
        </button>
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or ID..."
            className="w-full max-w-md bg-discord-dark border border-gray-600 rounded px-4 py-2"
          />
        </div>
      )}

      {/* List */}
      {filteredEntries.length > 0 ? (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Reason</th>
                <th className="pb-3 pr-4">Added By</th>
                <th className="pb-3 pr-4">Added On</th>
                <th className="pb-3 pr-4">Expires</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry._id} className={`border-b border-gray-700/50 ${isExpired(entry.expiresAt) ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium">{entry.odUsername || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{entry.odId}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-400">
                    {entry.reason || <span className="text-gray-600">No reason</span>}
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    {entry.addedByUsername || entry.addedBy || '-'}
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    {entry.expiresAt ? (
                      <span className={isExpired(entry.expiresAt) ? 'text-gray-500' : 'text-yellow-400'}>
                        {isExpired(entry.expiresAt) ? 'Expired' : new Date(entry.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">Never</span>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleRemove(entry.odId)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-discord-dark rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 bg-discord-dark rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">
            {searchQuery ? 'No users found matching your search.' : 'No blacklisted users.'}
          </p>
          {!searchQuery && (
            <p className="text-sm text-gray-500 mt-1">Users added here won't be able to create tickets.</p>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add to Blacklist</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">User ID *</label>
                <input
                  type="text"
                  value={form.odId}
                  onChange={(e) => setForm({ ...form, odId: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="Enter Discord user ID"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={form.odUsername}
                  onChange={(e) => setForm({ ...form, odUsername: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="Optional - for reference"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  rows={2}
                  placeholder="Why is this user being blacklisted?"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Expires (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for permanent blacklist</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setForm({ odId: '', odUsername: '', reason: '', expiresAt: '' }); }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 btn-primary"
              >
                {saving ? 'Adding...' : 'Add to Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
