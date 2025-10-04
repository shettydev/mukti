import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { connectToDatabase } from '@/lib/db/mongodb';

// Schema for email validation
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// GET: Check if email exists in waitlist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Validate email format
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('waitlist');

    const existingUser = await collection.findOne({ email });

    return NextResponse.json({
      exists: !!existingUser,
      joinedAt: existingUser?.joinedAt || null,
    });
  } catch (error) {
    console.error('Waitlist check API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Join waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate email
    const result = emailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { details: result.error, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const { db } = await connectToDatabase();
    const collection = db.collection('waitlist');

    // Check if email already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists in waitlist', isExisting: true },
        { status: 409 }
      );
    }

    // Add email to waitlist
    const newEntry = {
      email,
      ipAddress:
        request.headers.get('X-Forwarded-For') || request.headers.get('x-real-ip') || 'unknown',
      joinedAt: new Date(),
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    await collection.insertOne(newEntry);

    return NextResponse.json({ email, message: 'Successfully joined waitlist' }, { status: 201 });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
