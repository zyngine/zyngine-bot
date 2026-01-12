import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { TicketPanel } from '@/lib/schemas';

// Deploy a panel to Discord channel
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get the panel
    const panel = await TicketPanel.findOne({
      _id: params.panelId,
      guildId: params.guildId
    });

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    // Get bot token from environment
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({
        error: 'Bot token not configured. Use /ticket-panel deploy command in Discord instead.',
        useCommand: true
      }, { status: 503 });
    }

    // Build the embed
    const embed = {
      title: panel.embed?.title || panel.name,
      description: panel.embed?.description || panel.description || 'Click the button below to create a ticket.',
      color: parseInt((panel.embed?.color || '#5865F2').replace('#', ''), 16),
      footer: panel.embed?.footer ? { text: panel.embed.footer } : undefined,
      thumbnail: panel.embed?.thumbnail ? { url: panel.embed.thumbnail } : undefined,
      image: panel.embed?.image ? { url: panel.embed.image } : undefined
    };

    // Build components based on panel style
    let components = [];

    if (panel.style?.type === 'dropdown' && panel.categories?.length > 0) {
      // Dropdown style
      const options = panel.categories.map(cat => ({
        label: cat.name,
        value: cat.id,
        description: cat.description?.substring(0, 100),
        emoji: cat.emoji || undefined
      }));

      components.push({
        type: 1, // Action Row
        components: [{
          type: 3, // String Select Menu
          custom_id: `ticket_dropdown_${panel._id}`,
          placeholder: panel.style.placeholder || 'Select a category...',
          options
        }]
      });
    } else {
      // Button style (default)
      if (panel.categories?.length > 1) {
        // Multiple category buttons
        const buttons = panel.categories.slice(0, 5).map(cat => ({
          type: 2, // Button
          style: 1, // Primary
          label: cat.name,
          custom_id: `ticket_create_${panel._id}_${cat.id}`,
          emoji: cat.emoji ? { name: cat.emoji } : undefined
        }));

        components.push({
          type: 1,
          components: buttons
        });
      } else {
        // Single create ticket button
        components.push({
          type: 1,
          components: [{
            type: 2,
            style: 1,
            label: panel.style?.buttonLabel || 'Create Ticket',
            custom_id: `ticket_create_${panel._id}`,
            emoji: panel.style?.buttonEmoji ? { name: panel.style.buttonEmoji } : { name: '🎫' }
          }]
        });
      }
    }

    // Send message to Discord
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed],
        components
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Discord API error:', error);
      return NextResponse.json({
        error: error.message || 'Failed to send message to Discord',
        details: error
      }, { status: response.status });
    }

    const message = await response.json();

    // Update panel with the message ID and channel ID
    await TicketPanel.findByIdAndUpdate(panel._id, {
      $set: {
        deployedMessageId: message.id,
        deployedChannelId: channelId,
        deployedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      messageId: message.id,
      channelId
    });
  } catch (error) {
    console.error('Error deploying panel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
