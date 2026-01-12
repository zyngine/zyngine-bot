import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Blacklist } from '@/lib/schemas';

// Get all blacklisted users for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      Blacklist.find({ guildId: params.guildId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blacklist.countDocuments({ guildId: params.guildId })
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add user to blacklist
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Check if already blacklisted
    const existing = await Blacklist.findOne({
      guildId: params.guildId,
      odId: body.odId
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already blacklisted' }, { status: 400 });
    }

    const entry = new Blacklist({
      guildId: params.guildId,
      odId: body.odId,
      odUsername: body.odUsername,
      reason: body.reason,
      addedBy: session.user?.id,
      addedByUsername: session.user?.name,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    });

    await entry.save();

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove user from blacklist
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const odId = searchParams.get('odId');

    await Blacklist.deleteOne({ guildId: params.guildId, odId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
