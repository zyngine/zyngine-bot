import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { RoleRequest } from '@/lib/schemas';

// Approve or deny a role request
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, reason } = body;

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const roleRequest = await RoleRequest.findByIdAndUpdate(
      params.requestId,
      {
        status: action === 'approve' ? 'approved' : 'denied',
        resolvedBy: session.user?.name || 'Dashboard User',
        resolvedByUsername: session.user?.name,
        resolutionReason: reason || '',
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!roleRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(roleRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    await RoleRequest.findByIdAndDelete(params.requestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
