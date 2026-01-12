import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Guild } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guild = await Guild.findOne({ guildId: params.guildId });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    return NextResponse.json(guild);
  } catch (error) {
    console.error('Error fetching guild:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      { ...body, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    return NextResponse.json(guild);
  } catch (error) {
    console.error('Error updating guild:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
