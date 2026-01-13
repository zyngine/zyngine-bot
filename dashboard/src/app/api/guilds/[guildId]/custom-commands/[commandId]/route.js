import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { CustomCommand } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, commandId } = await params;
    await dbConnect();

    const command = await CustomCommand.findOne({ _id: commandId, guildId }).lean();

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json(command);
  } catch (error) {
    console.error('Error fetching command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, commandId } = await params;
    const updates = await request.json();

    await dbConnect();

    // Check for duplicate name if name is being changed
    if (updates.name) {
      const existing = await CustomCommand.findOne({
        guildId,
        name: updates.name.toLowerCase(),
        _id: { $ne: commandId }
      });

      if (existing) {
        return NextResponse.json({ error: 'A command with this name already exists' }, { status: 400 });
      }
      updates.name = updates.name.toLowerCase();
    }

    const command = await CustomCommand.findOneAndUpdate(
      { _id: commandId, guildId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json(command);
  } catch (error) {
    console.error('Error updating command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, commandId } = await params;
    await dbConnect();

    const result = await CustomCommand.findOneAndDelete({ _id: commandId, guildId });

    if (!result) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
