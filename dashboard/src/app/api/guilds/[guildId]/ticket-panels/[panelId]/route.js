import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { TicketPanel, ActivityLog } from '@/lib/schemas';

// Get a specific ticket panel
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const panel = await TicketPanel.findOne({
      _id: params.panelId,
      guildId: params.guildId
    });

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    return NextResponse.json(panel);
  } catch (error) {
    console.error('Error fetching ticket panel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a ticket panel
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Generate IDs for new categories and forms
    if (body.categories) {
      body.categories = body.categories.map(cat => ({
        ...cat,
        id: cat.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        forms: cat.forms?.map(form => ({
          ...form,
          id: form.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })) || []
      }));
    }

    if (body.forms) {
      body.forms = body.forms.map(form => ({
        ...form,
        id: form.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }

    if (body.automations) {
      body.automations = body.automations.map(auto => ({
        ...auto,
        id: auto.id || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }

    const panel = await TicketPanel.findOneAndUpdate(
      { _id: params.panelId, guildId: params.guildId },
      { $set: { ...body, updatedAt: new Date() } },
      { new: true }
    );

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    // Log the update
    await ActivityLog.create({
      guildId: params.guildId,
      action: 'panel_updated',
      performedBy: session.user?.id,
      performedByUsername: session.user?.name,
      panelId: panel._id,
      details: { panelName: panel.name }
    });

    return NextResponse.json(panel);
  } catch (error) {
    console.error('Error updating ticket panel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a ticket panel
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const panel = await TicketPanel.findOneAndDelete({
      _id: params.panelId,
      guildId: params.guildId
    });

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    // Log the deletion
    await ActivityLog.create({
      guildId: params.guildId,
      action: 'panel_deleted',
      performedBy: session.user?.id,
      performedByUsername: session.user?.name,
      details: { panelName: panel.name }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket panel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
