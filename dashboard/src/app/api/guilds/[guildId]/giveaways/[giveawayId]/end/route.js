import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Giveaway } from '@/lib/schemas';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, giveawayId } = await params;
    await connectDB();

    const giveaway = await Giveaway.findOne({ _id: giveawayId, guildId });

    if (!giveaway) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 });
    }

    if (giveaway.status === 'ended') {
      return NextResponse.json({ error: 'Giveaway already ended' }, { status: 400 });
    }

    // Select winners randomly
    const entries = giveaway.entries || [];
    const winnerCount = Math.min(giveaway.winners, entries.length);
    const winners = [];
    const winnerUsernames = [];
    const availableEntries = [...entries];

    for (let i = 0; i < winnerCount; i++) {
      if (availableEntries.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      const winner = availableEntries.splice(randomIndex, 1)[0];
      winners.push(winner.userId);
      winnerUsernames.push(winner.username);
    }

    giveaway.status = 'ended';
    giveaway.endedAt = new Date();
    giveaway.winnerIds = winners;
    giveaway.winnerUsernames = winnerUsernames;
    await giveaway.save();

    return NextResponse.json(giveaway);
  } catch (error) {
    console.error('Error ending giveaway:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
