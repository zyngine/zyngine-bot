import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { LoggingConfig } from '@/lib/schemas';

// GET logging configuration
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;

    await connectDB();

    let config = await LoggingConfig.findOne({ guildId }).lean();

    // Return default config if none exists
    if (!config) {
      config = {
        guildId,
        enabled: false,
        channels: {
          messages: null,
          members: null,
          moderation: null,
          roles: null,
          channels: null,
          voice: null,
          server: null,
          invites: null,
          automod: null
        },
        events: {
          messageDelete: true,
          messageEdit: true,
          messageBulkDelete: true,
          memberJoin: true,
          memberLeave: true,
          memberBan: true,
          memberUnban: true,
          memberKick: true,
          memberTimeout: true,
          memberNicknameChange: true,
          memberAvatarChange: false,
          memberRoleAdd: true,
          memberRoleRemove: true,
          roleCreate: true,
          roleDelete: true,
          roleUpdate: true,
          channelCreate: true,
          channelDelete: true,
          channelUpdate: true,
          voiceJoin: true,
          voiceLeave: true,
          voiceMove: true,
          voiceMute: false,
          voiceDeafen: false,
          serverUpdate: true,
          emojiCreate: true,
          emojiDelete: true,
          stickerCreate: false,
          stickerDelete: false,
          inviteCreate: true,
          inviteDelete: true
        },
        ignoredChannels: [],
        ignoredRoles: [],
        ignoredUsers: [],
        embedColor: '#00D4AA',
        showTimestamps: true,
        showAvatars: true,
        compactMode: false
      };
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching logging config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update logging configuration
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const body = await request.json();

    await connectDB();

    const config = await LoggingConfig.findOneAndUpdate(
      { guildId },
      {
        ...body,
        guildId,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating logging config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
