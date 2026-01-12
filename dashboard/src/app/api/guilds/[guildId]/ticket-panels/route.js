import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { TicketPanel } from '@/lib/schemas';

// Get all ticket panels for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const panels = await TicketPanel.find({ guildId: params.guildId })
      .sort({ createdAt: -1 });

    return NextResponse.json(panels);
  } catch (error) {
    console.error('Error fetching ticket panels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new ticket panel (note: the actual Discord message is created by the bot)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const panel = new TicketPanel({
      guildId: params.guildId,
      ...body
    });

    await panel.save();

    return NextResponse.json(panel);
  } catch (error) {
    console.error('Error creating ticket panel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
