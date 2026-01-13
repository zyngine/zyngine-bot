'use client';

import { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Trash2,
  Edit3,
  Save,
  Search,
  Code,
  MessageSquare,
  X,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function CustomCommandsPanel({ guildId, channels, roles, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    response: '',
    responseType: 'text',
    embed: {
      title: '',
      description: '',
      color: '#5865F2',
      footer: '',
      thumbnail: '',
      image: ''
    },
    allowedRoles: [],
    allowedChannels: [],
    cooldown: 0,
    deleteInvocation: false,
    dmResponse: false,
    enabled: true
  });

  useEffect(() => {
    fetchCommands();
  }, [guildId]);

  const fetchCommands = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/custom-commands`);
      if (res.ok) {
        setCommands(await res.json());
      }
    } catch (error) {
      console.error('Error fetching commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCommand = async () => {
    if (!newCommand.name) {
      onMessage('error', 'Please enter a command name');
      return;
    }
    if (!newCommand.response && newCommand.responseType === 'text') {
      onMessage('error', 'Please enter a response');
      return;
    }

    setSaving(true);
    try {
      const url = editingCommand
        ? `/api/guilds/${guildId}/custom-commands/${editingCommand._id}`
        : `/api/guilds/${guildId}/custom-commands`;

      const res = await fetch(url, {
        method: editingCommand ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommand)
      });

      if (res.ok) {
        const savedCommand = await res.json();
        if (editingCommand) {
          setCommands(commands.map(c => c._id === savedCommand._id ? savedCommand : c));
        } else {
          setCommands([savedCommand, ...commands]);
        }
        closeEditor();
        onMessage('success', editingCommand ? 'Command updated' : 'Command created');
      } else {
        const error = await res.json();
        onMessage('error', error.error || 'Failed to save command');
      }
    } catch (error) {
      onMessage('error', 'Failed to save command');
    } finally {
      setSaving(false);
    }
  };

  const deleteCommand = async (commandId) => {
    if (!confirm('Are you sure you want to delete this command?')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/custom-commands/${commandId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setCommands(commands.filter(c => c._id !== commandId));
        onMessage('success', 'Command deleted');
      } else {
        onMessage('error', 'Failed to delete command');
      }
    } catch (error) {
      onMessage('error', 'Failed to delete command');
    }
  };

  const toggleCommand = async (command) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/custom-commands/${command._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...command, enabled: !command.enabled })
      });

      if (res.ok) {
        const updated = await res.json();
        setCommands(commands.map(c => c._id === updated._id ? updated : c));
      }
    } catch (error) {
      onMessage('error', 'Failed to toggle command');
    }
  };

  const openEditor = (command = null) => {
    if (command) {
      setEditingCommand(command);
      setNewCommand({
        name: command.name,
        description: command.description || '',
        response: command.response || '',
        responseType: command.responseType || 'text',
        embed: command.embed || {
          title: '',
          description: '',
          color: '#5865F2',
          footer: '',
          thumbnail: '',
          image: ''
        },
        allowedRoles: command.allowedRoles || [],
        allowedChannels: command.allowedChannels || [],
        cooldown: command.cooldown || 0,
        deleteInvocation: command.deleteInvocation || false,
        dmResponse: command.dmResponse || false,
        enabled: command.enabled !== false
      });
    } else {
      setEditingCommand(null);
      setNewCommand({
        name: '',
        description: '',
        response: '',
        responseType: 'text',
        embed: {
          title: '',
          description: '',
          color: '#5865F2',
          footer: '',
          thumbnail: '',
          image: ''
        },
        allowedRoles: [],
        allowedChannels: [],
        cooldown: 0,
        deleteInvocation: false,
        dmResponse: false,
        enabled: true
      });
    }
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingCommand(null);
  };

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Terminal className="w-6 h-6 text-discord-accent" />
            Custom Commands
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Create custom commands with text or embed responses
          </p>
        </div>
        <button
          onClick={() => openEditor()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Create Command
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-discord-dark border border-gray-700 rounded-lg focus:border-discord-accent outline-none"
        />
      </div>

      {/* Commands List */}
      {filteredCommands.length > 0 ? (
        <div className="grid gap-3">
          {filteredCommands.map(command => (
            <div key={command._id} className="card hover:border-discord-accent/30 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-discord-accent font-mono">/{command.name}</code>
                    {!command.enabled && (
                      <span className="badge badge-error text-xs">Disabled</span>
                    )}
                    {command.responseType === 'embed' && (
                      <span className="badge badge-primary text-xs">Embed</span>
                    )}
                  </div>
                  {command.description && (
                    <p className="text-gray-400 text-sm">{command.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    {command.cooldown > 0 && (
                      <span>{command.cooldown}s cooldown</span>
                    )}
                    {command.allowedRoles?.length > 0 && (
                      <span>{command.allowedRoles.length} role restriction(s)</span>
                    )}
                    {command.uses > 0 && (
                      <span>{command.uses} uses</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={command.enabled !== false}
                      onChange={() => toggleCommand(command)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <button
                    onClick={() => openEditor(command)}
                    className="text-gray-400 hover:text-white p-2 rounded hover:bg-gray-700"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCommand(command._id)}
                    className="text-discord-red hover:bg-discord-red/20 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Preview */}
              {command.responseType === 'text' && command.response && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Response:</p>
                  <p className="text-sm text-gray-300 truncate">{command.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">
            {searchQuery ? 'No commands found' : 'No custom commands yet'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => openEditor()}
              className="btn-primary"
            >
              Create Your First Command
            </button>
          )}
        </div>
      )}

      {/* Command Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-discord-darker rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-discord-darker">
              <h3 className="text-xl font-semibold">
                {editingCommand ? 'Edit Command' : 'Create Command'}
              </h3>
              <button
                onClick={closeEditor}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Command Name *</label>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">/</span>
                    <input
                      type="text"
                      value={newCommand.name}
                      onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                      className="flex-1 bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="my-command"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={newCommand.description}
                    onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="What does this command do?"
                  />
                </div>
              </div>

              {/* Response Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Response Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewCommand({ ...newCommand, responseType: 'text' })}
                    className={`flex-1 p-3 rounded-lg border transition flex items-center justify-center gap-2 ${
                      newCommand.responseType === 'text'
                        ? 'border-discord-accent bg-discord-accent/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <MessageSquare size={18} />
                    Text
                  </button>
                  <button
                    onClick={() => setNewCommand({ ...newCommand, responseType: 'embed' })}
                    className={`flex-1 p-3 rounded-lg border transition flex items-center justify-center gap-2 ${
                      newCommand.responseType === 'embed'
                        ? 'border-discord-accent bg-discord-accent/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <Code size={18} />
                    Embed
                  </button>
                </div>
              </div>

              {/* Text Response */}
              {newCommand.responseType === 'text' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Response *</label>
                  <textarea
                    value={newCommand.response}
                    onChange={(e) => setNewCommand({ ...newCommand, response: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    rows={4}
                    placeholder="The response when the command is used..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{user}'}, {'{server}'}, {'{channel}'}, {'{membercount}'}
                  </p>
                </div>
              )}

              {/* Embed Response */}
              {newCommand.responseType === 'embed' && (
                <div className="space-y-4 p-4 bg-discord-dark rounded-lg">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Title</label>
                    <input
                      type="text"
                      value={newCommand.embed.title}
                      onChange={(e) => setNewCommand({
                        ...newCommand,
                        embed: { ...newCommand.embed, title: e.target.value }
                      })}
                      className="w-full bg-discord-darker border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={newCommand.embed.description}
                      onChange={(e) => setNewCommand({
                        ...newCommand,
                        embed: { ...newCommand.embed, description: e.target.value }
                      })}
                      className="w-full bg-discord-darker border border-gray-600 rounded-lg px-4 py-2"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Color</label>
                      <input
                        type="color"
                        value={newCommand.embed.color}
                        onChange={(e) => setNewCommand({
                          ...newCommand,
                          embed: { ...newCommand.embed, color: e.target.value }
                        })}
                        className="w-full h-10 bg-discord-darker border border-gray-600 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Footer</label>
                      <input
                        type="text"
                        value={newCommand.embed.footer}
                        onChange={(e) => setNewCommand({
                          ...newCommand,
                          embed: { ...newCommand.embed, footer: e.target.value }
                        })}
                        className="w-full bg-discord-darker border border-gray-600 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Image URL</label>
                    <input
                      type="text"
                      value={newCommand.embed.image}
                      onChange={(e) => setNewCommand({
                        ...newCommand,
                        embed: { ...newCommand.embed, image: e.target.value }
                      })}
                      className="w-full bg-discord-darker border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                <label className="block text-sm text-gray-400">Options</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Cooldown (seconds)</label>
                    <input
                      type="number"
                      value={newCommand.cooldown}
                      onChange={(e) => setNewCommand({ ...newCommand, cooldown: parseInt(e.target.value) || 0 })}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newCommand.deleteInvocation}
                        onChange={(e) => setNewCommand({ ...newCommand, deleteInvocation: e.target.checked })}
                      />
                      <span className="text-sm">Delete command message</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newCommand.dmResponse}
                        onChange={(e) => setNewCommand({ ...newCommand, dmResponse: e.target.checked })}
                      />
                      <span className="text-sm">Send response via DM</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Allowed Roles</label>
                  <select
                    multiple
                    value={newCommand.allowedRoles}
                    onChange={(e) => setNewCommand({
                      ...newCommand,
                      allowedRoles: Array.from(e.target.selectedOptions, opt => opt.value)
                    })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 min-h-[80px]"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Leave empty for everyone</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Allowed Channels</label>
                  <select
                    multiple
                    value={newCommand.allowedChannels}
                    onChange={(e) => setNewCommand({
                      ...newCommand,
                      allowedChannels: Array.from(e.target.selectedOptions, opt => opt.value)
                    })}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 min-h-[80px]"
                  >
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Leave empty for all channels</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={closeEditor}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveCommand}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? 'Saving...' : editingCommand ? 'Update Command' : 'Create Command'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
