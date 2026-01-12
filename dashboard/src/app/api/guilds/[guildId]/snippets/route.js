import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Snippet } from '@/lib/schemas';

// Get all snippets for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const snippets = await Snippet.find({ guildId: params.guildId })
      .sort({ useCount: -1 });

    return NextResponse.json(snippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new snippet
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const snippet = new Snippet({
      guildId: params.guildId,
      name: body.name,
      trigger: body.trigger,
      content: body.content,
      createdBy: session.user?.id
    });

    await snippet.save();

    return NextResponse.json(snippet);
  } catch (error) {
    console.error('Error creating snippet:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A snippet with that trigger already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a snippet
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const snippet = await Snippet.findOneAndUpdate(
      { _id: body.id, guildId: params.guildId },
      { $set: { name: body.name, trigger: body.trigger, content: body.content } },
      { new: true }
    );

    if (!snippet) {
      return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
    }

    return NextResponse.json(snippet);
  } catch (error) {
    console.error('Error updating snippet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a snippet
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const snippetId = searchParams.get('id');

    await Snippet.deleteOne({ _id: snippetId, guildId: params.guildId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
