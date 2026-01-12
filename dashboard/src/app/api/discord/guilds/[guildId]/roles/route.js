import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fetch roles from Discord for a guild
// Note: This requires a bot token, so we use the bot's token
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
      `https://discord.com/api/v10/guilds/${params.guildId}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to fetch roles' }, { status: response.status });
    }

    const roles = await response.json();

    // Sort by position descending and filter out @everyone
    const sortedRoles = roles
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => b.position - a.position);

    return NextResponse.json(sortedRoles);
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
