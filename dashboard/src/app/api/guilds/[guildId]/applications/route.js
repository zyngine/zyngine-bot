import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ApplicationTemplate } from '@/lib/schemas';

// GET all application templates for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;

    await connectDB();

    const applications = await ApplicationTemplate.find({ guildId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new application template
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId } = await params;
    const body = await request.json();

    await connectDB();

    // Check if application with same name exists
    const existing = await ApplicationTemplate.findOne({
      guildId,
      name: { $regex: new RegExp(`^${body.name}$`, 'i') }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An application with this name already exists' },
        { status: 400 }
      );
    }

    const application = new ApplicationTemplate({
      guildId,
      name: body.name,
      description: body.description || '',
      enabled: body.enabled !== false,
      questions: body.questions || [],
      logChannelId: body.logChannelId,
      staffThreads: body.staffThreads || false,
      completionMessage: body.completionMessage || 'Your application has been submitted successfully!',
      acceptMessage: body.acceptMessage || 'Congratulations! Your application has been accepted.',
      denyMessage: body.denyMessage || 'Unfortunately, your application has been denied.',
      requiredRoles: body.requiredRoles || [],
      restrictedRoles: body.restrictedRoles || [],
      managerRoles: body.managerRoles || [],
      pingRoles: body.pingRoles || [],
      acceptRoles: body.acceptRoles || [],
      denyRoles: body.denyRoles || [],
      removeRolesOnAccept: body.removeRolesOnAccept || [],
      removeRolesOnDeny: body.removeRolesOnDeny || [],
      cooldown: body.cooldown || 0,
      allowReapply: body.allowReapply !== false,
      dmOnSubmit: body.dmOnSubmit !== false,
      dmOnDecision: body.dmOnDecision !== false,
      createdBy: session.user?.id
    });

    await application.save();

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
