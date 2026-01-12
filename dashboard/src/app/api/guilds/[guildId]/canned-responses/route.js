import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { CannedResponse } from '@/lib/schemas';

// Get all canned responses for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const responses = await CannedResponse.find({ guildId: params.guildId })
      .sort({ useCount: -1 });

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new canned response
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const response = new CannedResponse({
      guildId: params.guildId,
      name: body.name,
      shortcut: body.shortcut,
      content: body.content,
      category: body.category,
      createdBy: session.user?.id
    });

    await response.save();

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating canned response:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A response with that shortcut already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a canned response
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('id');

    await CannedResponse.deleteOne({ _id: responseId, guildId: params.guildId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting canned response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
