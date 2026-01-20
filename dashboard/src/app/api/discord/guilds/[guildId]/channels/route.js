import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fetch channels from Discord for a guild
export async function GET(request, context) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured in dashboard environment');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    // Handle params - can be a Promise in Next.js 14+
    const params = context.params;
    const guildId = params.guildId;

    console.log('Fetching channels for guild:', guildId);

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Discord API error fetching channels:', response.status, error);
      return NextResponse.json({ error: error.message || 'Failed to fetch channels' }, { status: response.status });
    }

    const channels = await response.json();
    console.log('Fetched', channels.length, 'channels from Discord');

    // Filter to text channels and categories, sort by position
    // Type 0 = GUILD_TEXT, Type 4 = GUILD_CATEGORY
    const filteredChannels = channels
      .filter(channel => channel.type === 0 || channel.type === 4)
      .sort((a, b) => a.position - b.position);

    return NextResponse.json(filteredChannels);
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
