import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Ticket } from '@/lib/schemas';

// Get a specific ticket
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const ticket = await Ticket.findById(params.ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a ticket (close, change priority, etc.)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const updateData = { updatedAt: Date.now() };

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.closeReason !== undefined) updateData.closeReason = body.closeReason;

    if (body.status === 'closed') {
      updateData.closedAt = new Date();
      updateData.closedBy = session.user?.name || 'Dashboard';
      updateData.closedByUsername = session.user?.name;
    }

    const ticket = await Ticket.findByIdAndUpdate(
      params.ticketId,
      { $set: updateData },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a ticket
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    await Ticket.findByIdAndDelete(params.ticketId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
