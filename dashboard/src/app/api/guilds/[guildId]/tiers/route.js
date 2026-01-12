import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Guild } from '@/lib/schemas';

// Get all role tiers
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guild = await Guild.findOne({ guildId: params.guildId });

    return NextResponse.json(guild?.roleTiers || []);
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add a new tier
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, level, color, roles, approverRoles, requirements } = body;

    if (!name || level === undefined) {
      return NextResponse.json({ error: 'Name and level are required' }, { status: 400 });
    }

    const guild = await Guild.findOneAndUpdate(
      { guildId: params.guildId },
      {
        $push: {
          roleTiers: {
            name,
            level,
            color: color || '#5865F2',
            roles: roles || [],
            approverRoles: approverRoles || [],
            requirements: requirements || {
              minMessages: 0,
              minAccountAge: 0,
              minServerAge: 0,
              requiredRoles: []
            }
          }
        },
        $set: { updatedAt: Date.now() }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(guild.roleTiers);
  } catch (error) {
    console.error('Error adding tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update all tiers
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
          roleTiers: body.roleTiers,
          updatedAt: Date.now()
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(guild.roleTiers);
  } catch (error) {
    console.error('Error updating tiers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
