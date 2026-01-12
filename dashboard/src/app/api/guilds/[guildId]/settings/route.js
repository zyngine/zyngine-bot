import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Guild } from '@/lib/schemas';

// Get guild settings
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guild = await Guild.findOne({ guildId: params.guildId });

    if (!guild) {
      return NextResponse.json({
        guildId: params.guildId,
        requestCooldown: 3600,
        welcomeMessage: {
          enabled: false,
          message: 'Welcome to {server}! You have been assigned the {roles} role(s).',
          channelId: ''
        },
        notifications: {
          requestChannelId: '',
          logChannelId: '',
          approvalDMEnabled: true,
          denialDMEnabled: true
        }
      });
    }

    return NextResponse.json({
      guildId: guild.guildId,
      guildName: guild.guildName,
      requestCooldown: guild.requestCooldown,
      welcomeMessage: guild.welcomeMessage,
      notifications: guild.notifications
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update guild settings
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const updateData = {
      updatedAt: Date.now()
    };

    if (body.requestCooldown !== undefined) {
      updateData.requestCooldown = body.requestCooldown;
    }

    if (body.welcomeMessage) {
      updateData.welcomeMessage = body.welcomeMessage;
    }

    if (body.notifications) {
      updateData.notifications = body.notifications;
    }

    if (body.guildName) {
      updateData.guildName = body.guildName;
    }

    const guild = await Guild.findOneAndUpdate(
      { guildId: params.guildId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      guildId: guild.guildId,
      guildName: guild.guildName,
      requestCooldown: guild.requestCooldown,
      welcomeMessage: guild.welcomeMessage,
      notifications: guild.notifications
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
