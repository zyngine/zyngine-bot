import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Guild } from '@/lib/schemas';

// Get all auto-roles for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guild = await Guild.findOne({ guildId: params.guildId });

    return NextResponse.json(guild?.autoRoles || []);
  } catch (error) {
    console.error('Error fetching auto-roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add a new auto-role
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { roleId, roleName, delay, minAccountAge, ignoreBots, enabled } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const guild = await Guild.findOneAndUpdate(
      { guildId: params.guildId },
      {
        $push: {
          autoRoles: {
            roleId,
            roleName: roleName || roleId,
            delay: delay || 0,
            minAccountAge: minAccountAge || 0,
            ignoreBots: ignoreBots !== false,
            enabled: enabled !== false
          }
        },
        $set: { updatedAt: Date.now() }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(guild.autoRoles);
  } catch (error) {
    console.error('Error adding auto-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update auto-roles (replace all)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const guild = await Guild.findOneAndUpdate(
      { guildId: params.guildId },
      {
        $set: {
          autoRoles: body.autoRoles,
          updatedAt: Date.now()
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(guild.autoRoles);
  } catch (error) {
    console.error('Error updating auto-roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
