import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ApplicationTemplate, ApplicationSubmission } from '@/lib/schemas';

// GET single application template
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, applicationId } = await params;

    await connectDB();

    const application = await ApplicationTemplate.findOne({
      _id: applicationId,
      guildId
    }).lean();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get submission stats
    const stats = await ApplicationSubmission.aggregate([
      { $match: { applicationId: application._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const submissionStats = {
      pending: 0,
      accepted: 0,
      denied: 0,
      total: 0
    };

    stats.forEach(s => {
      submissionStats[s._id] = s.count;
      submissionStats.total += s.count;
    });

    return NextResponse.json({ application, stats: submissionStats });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update application template
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, applicationId } = await params;
    const body = await request.json();

    await connectDB();

    // Check if name is being changed and if it conflicts
    if (body.name) {
      const existing = await ApplicationTemplate.findOne({
        guildId,
        name: { $regex: new RegExp(`^${body.name}$`, 'i') },
        _id: { $ne: applicationId }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'An application with this name already exists' },
          { status: 400 }
        );
      }
    }

    const application = await ApplicationTemplate.findOneAndUpdate(
      { _id: applicationId, guildId },
      {
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    ).lean();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE application template
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, applicationId } = await params;

    await connectDB();

    const application = await ApplicationTemplate.findOneAndDelete({
      _id: applicationId,
      guildId
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Optionally delete all submissions for this application
    await ApplicationSubmission.deleteMany({ applicationId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
