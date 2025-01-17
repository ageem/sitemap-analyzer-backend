import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { domain } = await req.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete all search history records for this domain
    const deleted = await prisma.searchHistory.deleteMany({
      where: {
        userId: user.id,
        sitemapUrl: {
          contains: domain,
        },
      },
    })

    return NextResponse.json({ 
      success: true,
      deletedCount: deleted.count
    })
  } catch (error) {
    console.error('Error deleting search history:', error)
    return NextResponse.json(
      { error: 'Failed to delete search history' },
      { status: 500 }
    )
  }
}
