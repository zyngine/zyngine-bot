import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { LevelingConfig } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    await dbConnect();

    let config = await LevelingConfig.findOne({ guildId }).lean();

    if (!config) {
      config = {
        guildId,
        enabled: false,
        xpPerMessage: 15,
        xpCooldown: 60,
        levelUpChannelId: null,
        levelUpMessage: 'Congratulations {user}! You reached level {level}!',
        roleRewards: [],
        ignoredChannels: [],
        ignoredRoles: [],
        xpMultipliers: []
      };
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching leveling config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const updates = await request.json();

    await dbConnect();

    const config = await LevelingConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...updates, guildId } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating leveling config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
