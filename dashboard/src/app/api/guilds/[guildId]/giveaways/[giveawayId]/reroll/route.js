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

    if (giveaway.status !== 'ended') {
      return NextResponse.json({ error: 'Giveaway must be ended to reroll' }, { status: 400 });
    }

    // Select new winners randomly (excluding previous winners)
    const entries = (giveaway.entries || []).filter(
      e => !giveaway.winnerIds?.includes(e.userId)
    );

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No eligible entries to reroll' }, { status: 400 });
    }

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

    giveaway.winnerIds = winners;
    giveaway.winnerUsernames = winnerUsernames;
    giveaway.rerolledAt = new Date();
    await giveaway.save();

    return NextResponse.json(giveaway);
  } catch (error) {
    console.error('Error rerolling giveaway:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
