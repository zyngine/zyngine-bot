import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ModerationConfig } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    await connectDB();

    let config = await ModerationConfig.findOne({ guildId }).lean();

    if (!config) {
      // Return default config
      config = {
        guildId,
        logChannelId: null,
        muteRoleId: null,
        warnThresholds: {
          kick: 3,
          ban: 5
        },
        autoMod: {
          enabled: false,
          spamDetection: false,
          spamThreshold: 5,
          spamInterval: 5000,
          wordFilter: false,
          filteredWords: [],
          linkFilter: false,
          allowedLinks: [],
          mentionSpam: false,
          mentionLimit: 5,
          capsFilter: false,
          capsThreshold: 70,
          inviteFilter: false
        },
        exemptRoles: [],
        exemptChannels: []
      };
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching moderation config:', error);
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

    const config = await ModerationConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...updates, guildId } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating moderation config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
