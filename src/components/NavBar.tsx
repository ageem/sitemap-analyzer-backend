'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { UserDropdown } from './UserDropdown'

export function NavBar() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Sitemap Analyzer
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {status === 'authenticated' && session?.user ? (
              <>
                <Link href="/history" className="text-gray-700 hover:text-gray-900">
                  History
                </Link>
                <div className="relative ml-3">
                  <div>
                    <button
                      type="button"
                      className="flex items-center max-w-xs rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      id="user-menu-button"
                      aria-expanded="false"
                      aria-haspopup="true"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {session.user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    </button>
                  </div>
                  {isOpen && (
                    <UserDropdown userEmail={session.user.email || ''} />
                  )}
                </div>
              </>
            ) : status === 'unauthenticated' ? (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
