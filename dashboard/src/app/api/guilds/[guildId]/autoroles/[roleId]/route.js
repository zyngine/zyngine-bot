import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Guild } from '@/lib/schemas';

// Update a specific auto-role
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const guild = await Guild.findOneAndUpdate(
      {
        guildId: params.guildId,
        'autoRoles.roleId': params.roleId
      },
      {
        $set: {
          'autoRoles.$.enabled': body.enabled,
          'autoRoles.$.delay': body.delay,
          'autoRoles.$.minAccountAge': body.minAccountAge,
          'autoRoles.$.ignoreBots': body.ignoreBots,
          'autoRoles.$.roleName': body.roleName,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    if (!guild) {
      return NextResponse.json({ error: 'Auto-role not found' }, { status: 404 });
    }

    return NextResponse.json(guild.autoRoles);
  } catch (error) {
    console.error('Error updating auto-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a specific auto-role
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guild = await Guild.findOneAndUpdate(
      { guildId: params.guildId },
      {
        $pull: { autoRoles: { roleId: params.roleId } },
        $set: { updatedAt: Date.now() }
      },
      { new: true }
    );

    return NextResponse.json(guild?.autoRoles || []);
  } catch (error) {
    console.error('Error deleting auto-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
