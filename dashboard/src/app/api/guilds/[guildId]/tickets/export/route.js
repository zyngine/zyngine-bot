import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Ticket } from '@/lib/schemas';

// Export tickets as CSV
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build query
    const query = { guildId: params.guildId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(10000); // Limit to 10k tickets

    if (format === 'json') {
      return NextResponse.json(tickets);
    }

    // Generate CSV
    const headers = [
      'Ticket ID',
      'Number',
      'Subject',
      'Status',
      'Priority',
      'Category',
      'Creator ID',
      'Creator Username',
      'Claimed By ID',
      'Claimed By Username',
      'Created At',
      'First Response At',
      'Closed At',
      'Response Time (min)',
      'Resolution Time (min)',
      'Feedback Rating',
      'Feedback Comment',
      'Tags',
      'SLA Breached'
    ];

    const rows = tickets.map(ticket => {
      const responseTime = ticket.firstResponseAt
        ? Math.round((new Date(ticket.firstResponseAt) - new Date(ticket.createdAt)) / (1000 * 60))
        : '';
      const resolutionTime = ticket.closedAt
        ? Math.round((new Date(ticket.closedAt) - new Date(ticket.createdAt)) / (1000 * 60))
        : '';

      return [
        ticket._id.toString(),
        ticket.ticketNumber || '',
        escapeCSV(ticket.subject || ''),
        ticket.status,
        ticket.priority || 'medium',
        ticket.category || '',
        ticket.creatorId,
        escapeCSV(ticket.creatorUsername || ''),
        ticket.claimedBy || '',
        escapeCSV(ticket.claimedByUsername || ''),
        ticket.createdAt ? new Date(ticket.createdAt).toISOString() : '',
        ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toISOString() : '',
        ticket.closedAt ? new Date(ticket.closedAt).toISOString() : '',
        responseTime,
        resolutionTime,
        ticket.feedback?.rating || '',
        escapeCSV(ticket.feedback?.comment || ''),
        (ticket.tags || []).join('; '),
        ticket.slaBreached ? 'Yes' : 'No'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tickets-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function escapeCSV(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
