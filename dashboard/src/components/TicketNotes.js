'use client';

import { useState, useEffect } from 'react';

export default function TicketNotes({ guildId, ticketId, onMessage }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (ticketId) {
      fetchNotes();
    }
  }, [guildId, ticketId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/notes?ticketId=${ticketId}`);
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          content: newNote.trim()
        })
      });

      if (res.ok) {
        const note = await res.json();
        setNotes([note, ...notes]);
        setNewNote('');
        onMessage?.('success', 'Note added');
      } else {
        onMessage?.('error', 'Failed to add note');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId) => {
    if (!editContent.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          content: editContent.trim()
        })
      });

      if (res.ok) {
        const updatedNote = await res.json();
        setNotes(notes.map(n => n._id === noteId ? updatedNote : n));
        setEditingId(null);
        setEditContent('');
        onMessage?.('success', 'Note updated');
      } else {
        onMessage?.('error', 'Failed to update note');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/notes?id=${noteId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setNotes(notes.filter(n => n._id !== noteId));
        onMessage?.('success', 'Note deleted');
      } else {
        onMessage?.('error', 'Failed to delete note');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to delete note');
    }
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
        <h4 className="font-semibold text-sm text-gray-300">Internal Notes</h4>
        <span className="text-xs text-gray-500">{notes.length} notes</span>
      </div>

      {/* Add new note */}
      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private note (only visible to staff)..."
          className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2 text-sm resize-none"
          rows={2}
        />
        <button
          onClick={handleAddNote}
          disabled={!newNote.trim() || saving}
          className="text-sm bg-discord-accent hover:bg-discord-accent/80 px-4 py-1.5 rounded transition disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notes.map(note => (
            <div key={note._id} className="bg-discord-dark p-3 rounded-lg">
              {editingId === note._id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-discord-darker border border-gray-600 rounded px-2 py-1 text-sm resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note._id)}
                      disabled={saving}
                      className="text-xs bg-discord-green hover:bg-discord-green/80 px-3 py-1 rounded transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditContent(''); }}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      <span className="text-gray-400">{note.authorUsername || 'Unknown'}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <span className="ml-1 italic">(edited)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(note._id); setEditContent(note.content); }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-xs text-gray-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No notes yet. Add internal notes for your team.
        </p>
      )}
    </div>
  );
}
