import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Giveaway } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, giveawayId } = await params;
    await connectDB();

    const giveaway = await Giveaway.findOne({ _id: giveawayId, guildId }).lean();

    if (!giveaway) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 });
    }

    return NextResponse.json(giveaway);
  } catch (error) {
    console.error('Error fetching giveaway:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, giveawayId } = await params;
    await connectDB();

    const result = await Giveaway.findOneAndDelete({ _id: giveawayId, guildId });

    if (!result) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting giveaway:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
