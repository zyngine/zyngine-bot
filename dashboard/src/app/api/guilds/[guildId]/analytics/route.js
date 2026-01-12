import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Ticket, TicketAnalytics, StaffPerformance, ActivityLog } from '@/lib/schemas';

// Get analytics data for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 7d, 30d, 90d, all

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

    // Get tickets in range
    const tickets = await Ticket.find({
      guildId: params.guildId,
      createdAt: { $gte: startDate }
    });

    // Calculate metrics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const closedTickets = tickets.filter(t => t.status === 'closed').length;
    const onHoldTickets = tickets.filter(t => t.status === 'on_hold').length;

    // Calculate average response time (in minutes)
    const ticketsWithResponse = tickets.filter(t => t.firstResponseAt);
    const avgResponseTime = ticketsWithResponse.length > 0
      ? ticketsWithResponse.reduce((acc, t) => {
          const responseTime = (new Date(t.firstResponseAt) - new Date(t.createdAt)) / (1000 * 60);
          return acc + responseTime;
        }, 0) / ticketsWithResponse.length
      : 0;

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.status === 'closed' && t.closedAt);
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((acc, t) => {
          const resolutionTime = (new Date(t.closedAt) - new Date(t.createdAt)) / (1000 * 60);
          return acc + resolutionTime;
        }, 0) / resolvedTickets.length
      : 0;

    // Calculate feedback stats
    const ticketsWithFeedback = tickets.filter(t => t.feedback?.rating);
    const avgFeedback = ticketsWithFeedback.length > 0
      ? ticketsWithFeedback.reduce((acc, t) => acc + t.feedback.rating, 0) / ticketsWithFeedback.length
      : 0;

    // Tickets by category
    const byCategory = {};
    tickets.forEach(t => {
      const cat = t.category || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Tickets by priority
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    tickets.forEach(t => {
      byPriority[t.priority || 'medium']++;
    });

    // Tickets by status
    const byStatus = { open: openTickets, closed: closedTickets, on_hold: onHoldTickets };

    // Tickets over time (daily)
    const ticketsByDay = {};
    tickets.forEach(t => {
      const day = new Date(t.createdAt).toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    // Staff performance (top performers)
    const staffStats = {};
    tickets.forEach(t => {
      if (t.claimedBy) {
        if (!staffStats[t.claimedBy]) {
          staffStats[t.claimedBy] = {
            odId: t.claimedBy,
            odUsername: t.claimedByUsername || 'Unknown',
            claimed: 0,
            closed: 0,
            feedbackTotal: 0,
            feedbackCount: 0
          };
        }
        staffStats[t.claimedBy].claimed++;
        if (t.status === 'closed') staffStats[t.claimedBy].closed++;
        if (t.feedback?.rating) {
          staffStats[t.claimedBy].feedbackTotal += t.feedback.rating;
          staffStats[t.claimedBy].feedbackCount++;
        }
      }
    });

    const topStaff = Object.values(staffStats)
      .map(s => ({
        ...s,
        avgFeedback: s.feedbackCount > 0 ? s.feedbackTotal / s.feedbackCount : 0
      }))
      .sort((a, b) => b.closed - a.closed)
      .slice(0, 10);

    // Busiest hours
    const byHour = new Array(24).fill(0);
    tickets.forEach(t => {
      const hour = new Date(t.createdAt).getHours();
      byHour[hour]++;
    });
    const peakHour = byHour.indexOf(Math.max(...byHour));

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        closedTickets,
        onHoldTickets,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime),
        avgFeedback: Math.round(avgFeedback * 10) / 10,
        feedbackCount: ticketsWithFeedback.length
      },
      byCategory,
      byPriority,
      byStatus,
      ticketsByDay,
      topStaff,
      byHour,
      peakHour,
      range
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
