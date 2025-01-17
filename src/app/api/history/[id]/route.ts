import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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

    // Verify the history item belongs to the user
    const historyItem = await prisma.searchHistory.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!historyItem) {
      return NextResponse.json(
        { error: 'History item not found' },
        { status: 404 }
      )
    }

    // Delete the history item
    await prisma.searchHistory.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting history item:', error)
    return NextResponse.json(
      { error: 'Failed to delete history item' },
      { status: 500 }
    )
  }
}
