import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fetch roles from Discord for a guild
// Note: This requires a bot token, so we use the bot's token
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

    console.log('Fetching roles for guild:', guildId);

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Discord API error fetching roles:', response.status, error);
      return NextResponse.json({ error: error.message || 'Failed to fetch roles' }, { status: response.status });
    }

    const roles = await response.json();
    console.log('Fetched', roles.length, 'roles from Discord');

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
