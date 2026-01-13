import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { StarboardConfig } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    await connectDB();

    let config = await StarboardConfig.findOne({ guildId }).lean();

    if (!config) {
      config = {
        guildId,
        enabled: false,
        channelId: null,
        emoji: '⭐',
        threshold: 3,
        selfStar: false,
        ignoredChannels: [],
        allowNSFW: false,
        embedColor: '#FFD700'
      };
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching starboard config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const updates = await request.json();

    await connectDB();

    const config = await StarboardConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...updates, guildId } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating starboard config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
