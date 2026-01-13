import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Giveaway } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    await dbConnect();

    const giveaways = await Giveaway.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(giveaways);
  } catch (error) {
    console.error('Error fetching giveaways:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const data = await request.json();

    await dbConnect();

    const giveaway = new Giveaway({
      guildId,
      prize: data.prize,
      description: data.description,
      channelId: data.channelId,
      hostId: session.user.id,
      hostUsername: session.user.name,
      duration: data.duration,
      winners: data.winners || 1,
      requiredRoles: data.requiredRoles || [],
      bonusEntries: data.bonusEntries || [],
      status: 'pending',
      entries: []
    });

    await giveaway.save();

    return NextResponse.json(giveaway);
  } catch (error) {
    console.error('Error creating giveaway:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
