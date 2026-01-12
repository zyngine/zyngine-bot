import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Ticket, ActivityLog } from '@/lib/schemas';

// Perform bulk actions on tickets
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { ticketIds, action, data } = body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: 'No tickets selected' }, { status: 400 });
    }

    if (ticketIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 tickets per bulk action' }, { status: 400 });
    }

    let updateData = {};
    let logAction = '';

    switch (action) {
      case 'close':
        updateData = {
          status: 'closed',
          closedAt: new Date(),
          closedBy: session.user?.id,
          closedByUsername: session.user?.name
        };
        logAction = 'ticket_bulk_close';
        break;

      case 'reopen':
        updateData = {
          status: 'open',
          closedAt: null,
          closedBy: null
        };
        logAction = 'ticket_bulk_reopen';
        break;

      case 'set_priority':
        if (!data?.priority || !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
          return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
        }
        updateData = { priority: data.priority };
        logAction = 'ticket_bulk_priority';
        break;

      case 'assign':
        updateData = {
          claimedBy: data?.staffId || null,
          claimedByUsername: data?.staffUsername || null,
          claimedAt: data?.staffId ? new Date() : null
        };
        logAction = data?.staffId ? 'ticket_bulk_assign' : 'ticket_bulk_unassign';
        break;

      case 'add_tag':
        if (!data?.tag) {
          return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
        }
        await Ticket.updateMany(
          { _id: { $in: ticketIds }, guildId: params.guildId },
          { $addToSet: { tags: data.tag } }
        );
        logAction = 'ticket_bulk_tag';
        break;

      case 'remove_tag':
        if (!data?.tag) {
          return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
        }
        await Ticket.updateMany(
          { _id: { $in: ticketIds }, guildId: params.guildId },
          { $pull: { tags: data.tag } }
        );
        logAction = 'ticket_bulk_untag';
        break;

      case 'set_category':
        updateData = { category: data?.category || null };
        logAction = 'ticket_bulk_category';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Execute bulk update (if not tag operations which are already done)
    if (Object.keys(updateData).length > 0) {
      await Ticket.updateMany(
        { _id: { $in: ticketIds }, guildId: params.guildId },
        { $set: updateData }
      );
    }

    // Log the bulk action
    await ActivityLog.create({
      guildId: params.guildId,
      actionType: logAction,
      user: {
        odId: session.user?.id,
        odUsername: session.user?.name
      },
      details: {
        ticketCount: ticketIds.length,
        action,
        data
      }
    });

    return NextResponse.json({
      success: true,
      affected: ticketIds.length,
      action
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
