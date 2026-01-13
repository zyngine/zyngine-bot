import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ApplicationSubmission, ApplicationTemplate } from '@/lib/schemas';

// GET all submissions for a guild (with optional filters)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status'); // pending, accepted, denied
    const applicationId = searchParams.get('applicationId');
    const userId = searchParams.get('userId');

    await connectDB();

    // Build query
    const query = { guildId };
    if (status) query.status = status;
    if (applicationId) query.applicationId = applicationId;
    if (userId) query.userId = userId;

    const total = await ApplicationSubmission.countDocuments(query);
    const submissions = await ApplicationSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get application names for each submission
    const applicationIds = [...new Set(submissions.map(s => s.applicationId?.toString()))];
    const applications = await ApplicationTemplate.find({
      _id: { $in: applicationIds }
    }).select('name').lean();

    const applicationMap = {};
    applications.forEach(a => {
      applicationMap[a._id.toString()] = a.name;
    });

    // Attach application names
    const enrichedSubmissions = submissions.map(s => ({
      ...s,
      applicationName: s.applicationName || applicationMap[s.applicationId?.toString()] || 'Unknown'
    }));

    return NextResponse.json({
      submissions: enrichedSubmissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new submission (usually from bot, but can be from dashboard)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const body = await request.json();

    await connectDB();

    // Get application template
    const application = await ApplicationTemplate.findOne({
      _id: body.applicationId,
      guildId
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!application.enabled) {
      return NextResponse.json({ error: 'Application is currently disabled' }, { status: 400 });
    }

    // Check cooldown if reapplying
    if (application.cooldown > 0) {
      const lastSubmission = await ApplicationSubmission.findOne({
        applicationId: body.applicationId,
        userId: body.userId
      }).sort({ createdAt: -1 });

      if (lastSubmission) {
        const cooldownEnd = new Date(lastSubmission.createdAt.getTime() + application.cooldown * 1000);
        if (new Date() < cooldownEnd) {
          return NextResponse.json(
            { error: 'You must wait before submitting another application' },
            { status: 429 }
          );
        }
      }
    }

    // Check if user has pending application
    const pendingSubmission = await ApplicationSubmission.findOne({
      applicationId: body.applicationId,
      userId: body.userId,
      status: 'pending'
    });

    if (pendingSubmission) {
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 400 }
      );
    }

    const submission = new ApplicationSubmission({
      guildId,
      applicationId: body.applicationId,
      applicationName: application.name,
      userId: body.userId,
      username: body.username,
      userAvatar: body.userAvatar,
      responses: body.responses || [],
      status: 'pending'
    });

    await submission.save();

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
