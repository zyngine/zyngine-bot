'use client';

import { useState, useEffect } from 'react';

export default function ScheduledActions({ guildId, ticketId = null, onMessage }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    ticketId: ticketId || '',
    actionType: 'reminder',
    scheduledFor: '',
    data: { message: '' }
  });

  const actionTypes = [
    { value: 'reminder', label: 'Send Reminder', description: 'Send a follow-up message' },
    { value: 'close', label: 'Auto Close', description: 'Automatically close the ticket' },
    { value: 'priority_escalate', label: 'Escalate Priority', description: 'Increase ticket priority' },
    { value: 'notify_staff', label: 'Notify Staff', description: 'Alert staff members' }
  ];

  useEffect(() => {
    fetchActions();
  }, [guildId, ticketId]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const url = ticketId
        ? `/api/guilds/${guildId}/scheduled-actions?ticketId=${ticketId}&status=pending`
        : `/api/guilds/${guildId}/scheduled-actions?status=pending`;
      const res = await fetch(url);
      if (res.ok) {
        setActions(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch scheduled actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.scheduledFor) {
      onMessage?.('error', 'Please select a date and time');
      return;
    }
    if (form.actionType === 'reminder' && !form.data.message) {
      onMessage?.('error', 'Please enter a reminder message');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/scheduled-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ticketId: form.ticketId || ticketId
        })
      });

      if (res.ok) {
        const action = await res.json();
        setActions([action, ...actions].sort((a, b) =>
          new Date(a.scheduledFor) - new Date(b.scheduledFor)
        ));
        setShowModal(false);
        setForm({
          ticketId: ticketId || '',
          actionType: 'reminder',
          scheduledFor: '',
          data: { message: '' }
        });
        onMessage?.('success', 'Follow-up scheduled');
      } else {
        const error = await res.json();
        onMessage?.('error', error.error || 'Failed to schedule action');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to schedule action');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (actionId) => {
    if (!confirm('Are you sure you want to cancel this scheduled action?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/scheduled-actions?id=${actionId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setActions(actions.filter(a => a._id !== actionId));
        onMessage?.('success', 'Action cancelled');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to cancel action');
    }
  };

  const getActionLabel = (type) => {
    return actionTypes.find(t => t.value === type)?.label || type;
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const getTimeUntil = (date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = target - now;

    if (diff <= 0) return 'Now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
  };

  // Set minimum date to now
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm text-gray-300">Scheduled Follow-ups</h4>
          <p className="text-xs text-gray-500">{actions.length} pending actions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm bg-discord-accent hover:bg-discord-accent/80 px-3 py-1 rounded transition"
        >
          + Schedule
        </button>
      </div>

      {/* Actions list */}
      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map(action => (
            <div key={action._id} className="bg-discord-dark p-3 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{getActionLabel(action.actionType)}</span>
                    <span className="text-xs text-discord-accent">{getTimeUntil(action.scheduledFor)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(action.scheduledFor)}
                  </p>
                  {action.data?.message && (
                    <p className="text-sm text-gray-400 mt-2 italic">"{action.data.message}"</p>
                  )}
                </div>
                <button
                  onClick={() => handleCancel(action._id)}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  Cancel
                </button>
              </div>
              {action.createdByUsername && (
                <p className="text-xs text-gray-600 mt-2">
                  Created by {action.createdByUsername}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No scheduled follow-ups. Schedule reminders or automated actions.
        </p>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Schedule Follow-up</h3>

            <div className="space-y-4">
              {!ticketId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ticket ID</label>
                  <input
                    type="text"
                    value={form.ticketId}
                    onChange={(e) => setForm({ ...form, ticketId: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter ticket ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Action Type</label>
                <select
                  value={form.actionType}
                  onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                >
                  {actionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                  min={getMinDateTime()}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                />
              </div>

              {form.actionType === 'reminder' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reminder Message</label>
                  <textarea
                    value={form.data.message}
                    onChange={(e) => setForm({ ...form, data: { ...form.data, message: e.target.value } })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                    rows={3}
                    placeholder="Message to send as a reminder..."
                  />
                </div>
              )}

              {form.actionType === 'notify_staff' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notification Message</label>
                  <input
                    type="text"
                    value={form.data.message || ''}
                    onChange={(e) => setForm({ ...form, data: { ...form.data, message: e.target.value } })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                    placeholder="What should staff be notified about?"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm({
                    ticketId: ticketId || '',
                    actionType: 'reminder',
                    scheduledFor: '',
                    data: { message: '' }
                  });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 btn-primary"
              >
                {saving ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
