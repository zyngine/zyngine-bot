import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fetch channels from Discord for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${params.guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to fetch channels' }, { status: response.status });
    }

    const channels = await response.json();

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
