'use client';

import { useState, useEffect } from 'react';

export default function CannedResponses({ guildId, onMessage }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    shortcut: '',
    content: '',
    category: ''
  });

  useEffect(() => {
    fetchResponses();
  }, [guildId]);

  const fetchResponses = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/canned-responses`);
      if (res.ok) {
        setResponses(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch canned responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (response = null) => {
    if (response) {
      setEditing(response);
      setForm({
        name: response.name,
        shortcut: response.shortcut,
        content: response.content,
        category: response.category || ''
      });
    } else {
      setEditing(null);
      setForm({ name: '', shortcut: '', content: '', category: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.shortcut || !form.content) {
      onMessage?.('error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/canned-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        const newResponse = await res.json();
        if (editing) {
          setResponses(responses.map(r => r._id === editing._id ? newResponse : r));
        } else {
          setResponses([newResponse, ...responses]);
        }
        setShowModal(false);
        onMessage?.('success', editing ? 'Response updated' : 'Response created');
      } else {
        const error = await res.json();
        onMessage?.('error', error.error || 'Failed to save response');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to save response');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/canned-responses?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setResponses(responses.filter(r => r._id !== id));
        onMessage?.('success', 'Response deleted');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to delete response');
    }
  };

  // Group responses by category
  const groupedResponses = responses.reduce((acc, response) => {
    const cat = response.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(response);
    return acc;
  }, {});

  const categories = Object.keys(groupedResponses).sort();

  if (loading) {
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
          <h2 className="text-xl font-semibold">Canned Responses</h2>
          <p className="text-sm text-gray-400">Pre-written responses for quick replies</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          + Add Response
        </button>
      </div>

      {responses.length > 0 ? (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{category}</h3>
              <div className="grid gap-3">
                {groupedResponses[category].map(response => (
                  <div key={response._id} className="card hover:border-gray-600 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium">{response.name}</span>
                          <code className="px-2 py-0.5 bg-discord-dark rounded text-sm text-discord-accent">
                            /{response.shortcut}
                          </code>
                          {response.useCount > 0 && (
                            <span className="text-xs text-gray-500">
                              Used {response.useCount} times
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2">{response.content}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => openModal(response)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(response._id)}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">No canned responses yet.</p>
          <p className="text-sm text-gray-500 mt-1">Create responses for common questions to save time.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">
              {editing ? 'Edit Response' : 'Add Canned Response'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="e.g., Greeting"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Shortcut *</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">/</span>
                  <input
                    type="text"
                    value={form.shortcut}
                    onChange={(e) => setForm({ ...form, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="flex-1 bg-discord-dark border border-gray-600 rounded px-3 py-2"
                    placeholder="e.g., greeting"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Type /{form.shortcut || 'shortcut'} to use this response</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="e.g., General, Support, Sales"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  rows={5}
                  placeholder="Enter the response text..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {'{user}'} - user mention, {'{ticket}'} - ticket number
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary"
              >
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
