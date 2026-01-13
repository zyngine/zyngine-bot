import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ApplicationSubmission, ApplicationTemplate } from '@/lib/schemas';

// GET single submission
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, submissionId } = await params;

    await connectDB();

    const submission = await ApplicationSubmission.findOne({
      _id: submissionId,
      guildId
    }).lean();

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get application template for additional context
    const application = await ApplicationTemplate.findById(submission.applicationId)
      .select('name questions')
      .lean();

    return NextResponse.json({ submission, application });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update submission (accept/deny)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, submissionId } = await params;
    const body = await request.json();

    await connectDB();

    const submission = await ApplicationSubmission.findOne({
      _id: submissionId,
      guildId
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'This submission has already been reviewed' },
        { status: 400 }
      );
    }

    // Validate status change
    if (!['accepted', 'denied', 'cancelled'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    submission.status = body.status;
    submission.reviewedBy = session.user?.id;
    submission.reviewedByUsername = session.user?.name;
    submission.reviewedAt = new Date();
    submission.reviewNote = body.reviewNote || '';

    await submission.save();

    // Get application template for role actions
    const application = await ApplicationTemplate.findById(submission.applicationId).lean();

    return NextResponse.json({
      submission,
      application,
      roleActions: {
        acceptRoles: application?.acceptRoles || [],
        denyRoles: application?.denyRoles || [],
        removeRolesOnAccept: application?.removeRolesOnAccept || [],
        removeRolesOnDeny: application?.removeRolesOnDeny || []
      }
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE submission
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, submissionId } = await params;

    await connectDB();

    const submission = await ApplicationSubmission.findOneAndDelete({
      _id: submissionId,
      guildId
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
