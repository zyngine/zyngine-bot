import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ScheduledAction } from '@/lib/schemas';

// Get scheduled actions for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const status = searchParams.get('status');

    const query = { guildId: params.guildId };
    if (ticketId) query.ticketId = ticketId;
    if (status) query.status = status;

    const actions = await ScheduledAction.find(query)
      .sort({ scheduledFor: 1 });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching scheduled actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a scheduled action
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validate scheduled time is in the future
    const scheduledFor = new Date(body.scheduledFor);
    if (scheduledFor <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    const action = new ScheduledAction({
      guildId: params.guildId,
      ticketId: body.ticketId,
      actionType: body.actionType,
      scheduledFor,
      data: body.data || {},
      createdBy: session.user?.id,
      createdByUsername: session.user?.name,
      status: 'pending'
    });

    await action.save();

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error creating scheduled action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a scheduled action
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const updateData = {};
    if (body.scheduledFor) {
      const scheduledFor = new Date(body.scheduledFor);
      if (scheduledFor <= new Date()) {
        return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
      }
      updateData.scheduledFor = scheduledFor;
    }
    if (body.actionType) updateData.actionType = body.actionType;
    if (body.data) updateData.data = body.data;
    if (body.status) updateData.status = body.status;

    const action = await ScheduledAction.findOneAndUpdate(
      { _id: body.id, guildId: params.guildId, status: 'pending' },
      { $set: updateData },
      { new: true }
    );

    if (!action) {
      return NextResponse.json({ error: 'Action not found or already executed' }, { status: 404 });
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Error updating scheduled action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Cancel a scheduled action
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('id');

    const action = await ScheduledAction.findOneAndUpdate(
      { _id: actionId, guildId: params.guildId, status: 'pending' },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!action) {
      return NextResponse.json({ error: 'Action not found or already executed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling scheduled action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
