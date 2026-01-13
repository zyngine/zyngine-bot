import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { ModerationCase } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    await dbConnect();

    // Build query
    const query = { guildId };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { targetUsername: { $regex: search, $options: 'i' } },
        { moderatorUsername: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { caseNumber: parseInt(search) || -1 }
      ];
    }

    const total = await ModerationCase.countDocuments(query);
    const cases = await ModerationCase.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get stats
    const stats = await ModerationCase.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {
      total: 0,
      warn: 0,
      kick: 0,
      ban: 0,
      timeout: 0,
      mute: 0,
      unban: 0,
      untimeout: 0,
      unmute: 0
    };

    stats.forEach(s => {
      statsMap[s._id] = s.count;
      statsMap.total += s.count;
    });

    return NextResponse.json({
      cases,
      stats: statsMap,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching moderation cases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const { caseNumber } = await request.json();

    await dbConnect();

    const result = await ModerationCase.findOneAndDelete({
      guildId,
      caseNumber
    });

    if (!result) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moderation case:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
