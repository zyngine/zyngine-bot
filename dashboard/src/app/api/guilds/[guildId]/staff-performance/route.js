import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Ticket, StaffPerformance } from '@/lib/schemas';

// Get staff performance/leaderboard for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const sortBy = searchParams.get('sortBy') || 'closed';

    // Calculate date range
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Aggregate ticket data by staff
    const tickets = await Ticket.find({
      guildId: params.guildId,
      claimedBy: { $ne: null },
      createdAt: { $gte: startDate }
    });

    // Build staff stats
    const staffMap = new Map();

    tickets.forEach(ticket => {
      const staffId = ticket.claimedBy;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          odId: staffId,
          odUsername: ticket.claimedByUsername || 'Unknown',
          ticketsClaimed: 0,
          ticketsClosed: 0,
          avgResponseTime: 0,
          avgResolutionTime: 0,
          totalResponseTime: 0,
          totalResolutionTime: 0,
          responsesCount: 0,
          resolutionsCount: 0,
          feedbackTotal: 0,
          feedbackCount: 0,
          slaBreaches: 0
        });
      }

      const stats = staffMap.get(staffId);
      stats.ticketsClaimed++;

      if (ticket.status === 'closed') {
        stats.ticketsClosed++;
        if (ticket.closedAt && ticket.createdAt) {
          const resolutionTime = (new Date(ticket.closedAt) - new Date(ticket.createdAt)) / (1000 * 60);
          stats.totalResolutionTime += resolutionTime;
          stats.resolutionsCount++;
        }
      }

      if (ticket.firstResponseAt && ticket.createdAt) {
        const responseTime = (new Date(ticket.firstResponseAt) - new Date(ticket.createdAt)) / (1000 * 60);
        stats.totalResponseTime += responseTime;
        stats.responsesCount++;
      }

      if (ticket.feedback?.rating) {
        stats.feedbackTotal += ticket.feedback.rating;
        stats.feedbackCount++;
      }

      if (ticket.slaBreached) {
        stats.slaBreaches++;
      }
    });

    // Calculate averages and format results
    const staffList = Array.from(staffMap.values()).map(staff => ({
      odId: staff.odId,
      odUsername: staff.odUsername,
      ticketsClaimed: staff.ticketsClaimed,
      ticketsClosed: staff.ticketsClosed,
      closeRate: staff.ticketsClaimed > 0
        ? Math.round((staff.ticketsClosed / staff.ticketsClaimed) * 100)
        : 0,
      avgResponseTime: staff.responsesCount > 0
        ? Math.round(staff.totalResponseTime / staff.responsesCount)
        : 0,
      avgResolutionTime: staff.resolutionsCount > 0
        ? Math.round(staff.totalResolutionTime / staff.resolutionsCount)
        : 0,
      avgRating: staff.feedbackCount > 0
        ? Math.round((staff.feedbackTotal / staff.feedbackCount) * 10) / 10
        : 0,
      feedbackCount: staff.feedbackCount,
      slaBreaches: staff.slaBreaches
    }));

    // Sort based on sortBy parameter
    const sortFunctions = {
      closed: (a, b) => b.ticketsClosed - a.ticketsClosed,
      claimed: (a, b) => b.ticketsClaimed - a.ticketsClaimed,
      rating: (a, b) => b.avgRating - a.avgRating,
      response: (a, b) => (a.avgResponseTime || Infinity) - (b.avgResponseTime || Infinity),
      resolution: (a, b) => (a.avgResolutionTime || Infinity) - (b.avgResolutionTime || Infinity)
    };

    staffList.sort(sortFunctions[sortBy] || sortFunctions.closed);

    // Add rank
    staffList.forEach((staff, index) => {
      staff.rank = index + 1;
    });

    return NextResponse.json({
      staff: staffList,
      range,
      sortBy,
      totalStaff: staffList.length
    });
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
