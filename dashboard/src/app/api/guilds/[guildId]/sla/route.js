import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { SlaConfig } from '@/lib/schemas';

// Get SLA config for a guild
export async function GET(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let config = await SlaConfig.findOne({ guildId: params.guildId });

    if (!config) {
      // Return default config
      config = {
        guildId: params.guildId,
        enabled: false,
        responseTargets: { urgent: 15, high: 60, medium: 240, low: 480 },
        resolutionTargets: { urgent: 60, high: 480, medium: 1440, low: 2880 },
        alerts: { enabled: true, channelId: '', warnAtPercent: 80, pingRoles: [] },
        businessHours: {
          enabled: false,
          timezone: 'UTC',
          schedule: [
            { day: 1, start: '09:00', end: '17:00' },
            { day: 2, start: '09:00', end: '17:00' },
            { day: 3, start: '09:00', end: '17:00' },
            { day: 4, start: '09:00', end: '17:00' },
            { day: 5, start: '09:00', end: '17:00' }
          ],
          pauseSlaOutsideHours: true
        }
      };
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching SLA config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update SLA config
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const config = await SlaConfig.findOneAndUpdate(
      { guildId: params.guildId },
      { $set: { ...body, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating SLA config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
