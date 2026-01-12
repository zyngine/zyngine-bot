'use client';

import { useState, useEffect } from 'react';

export default function TagsManager({ guildId, onMessage }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    color: '#6366f1',
    description: ''
  });

  const presetColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];

  useEffect(() => {
    fetchTags();
  }, [guildId]);

  const fetchTags = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tags`);
      if (res.ok) {
        setTags(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tag = null) => {
    if (tag) {
      setEditing(tag);
      setForm({
        name: tag.name,
        color: tag.color,
        description: tag.description || ''
      });
    } else {
      setEditing(null);
      setForm({ name: '', color: '#6366f1', description: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      onMessage?.('error', 'Please enter a tag name');
      return;
    }

    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing._id } : form;

      const res = await fetch(`/api/guilds/${guildId}/tags`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const savedTag = await res.json();
        if (editing) {
          setTags(tags.map(t => t._id === editing._id ? savedTag : t));
        } else {
          setTags([...tags, savedTag]);
        }
        setShowModal(false);
        onMessage?.('success', editing ? 'Tag updated' : 'Tag created');
      } else {
        const error = await res.json();
        onMessage?.('error', error.error || 'Failed to save tag');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/tags?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setTags(tags.filter(t => t._id !== id));
        onMessage?.('success', 'Tag deleted');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to delete tag');
    }
  };

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
          <h2 className="text-xl font-semibold">Ticket Tags</h2>
          <p className="text-sm text-gray-400">Organize tickets with custom tags</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          + Add Tag
        </button>
      </div>

      {tags.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map(tag => (
            <div key={tag._id} className="card hover:border-gray-600 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(tag)}
                    className="text-gray-400 hover:text-white p-1 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tag._id)}
                    className="text-gray-400 hover:text-red-400 p-1 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {tag.description && (
                <p className="text-sm text-gray-400 mt-2">{tag.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">No tags created yet.</p>
          <p className="text-sm text-gray-500 mt-1">Tags help categorize and filter tickets.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {editing ? 'Edit Tag' : 'Add Tag'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="e.g., Bug, Feature Request"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        form.color === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-10 bg-discord-dark border border-gray-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  placeholder="Optional description"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Preview</label>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: form.color + '33', color: form.color }}
                >
                  {form.name || 'Tag Name'}
                </span>
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
