import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import type { HistoryResponse } from '@/types/api'

export async function GET(): Promise<NextResponse<HistoryResponse>> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated', status: 401 },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', status: 404 },
        { status: 404 }
      )
    }

    const history = await prisma.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { searchDate: 'desc' },
    })

    return NextResponse.json({
      data: history,
      status: 200
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history', status: 500 },
      { status: 500 }
    )
  }
}
