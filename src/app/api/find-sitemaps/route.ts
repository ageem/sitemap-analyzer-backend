import { NextResponse } from 'next/server';
import { findSitemaps } from '@/utils/sitemapFinder';

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    const result = await findSitemaps(domain);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      fromRobotsTxt: result.fromRobotsTxt,
      commonLocations: result.commonLocations
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
