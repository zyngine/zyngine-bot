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

    const { guildId } = await params;
    await dbConnect();

    const commands = await CustomCommand.find({ guildId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(commands);
  } catch (error) {
    console.error('Error fetching custom commands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const data = await request.json();

    await dbConnect();

    // Check for duplicate command name
    const existing = await CustomCommand.findOne({
      guildId,
      name: data.name.toLowerCase()
    });

    if (existing) {
      return NextResponse.json({ error: 'A command with this name already exists' }, { status: 400 });
    }

    const command = new CustomCommand({
      guildId,
      name: data.name.toLowerCase(),
      description: data.description,
      response: data.response,
      responseType: data.responseType || 'text',
      embed: data.embed,
      allowedRoles: data.allowedRoles || [],
      allowedChannels: data.allowedChannels || [],
      cooldown: data.cooldown || 0,
      deleteInvocation: data.deleteInvocation || false,
      dmResponse: data.dmResponse || false,
      enabled: data.enabled !== false,
      createdBy: session.user.id
    });

    await command.save();

    return NextResponse.json(command);
  } catch (error) {
    console.error('Error creating custom command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
