'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/toast'
import { ClientSessionCheck } from '@/components/ClientSessionCheck'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export default function ProfilePage() {
  return (
    <ClientSessionCheck>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Profile Settings</h1>
        <ProfileContent />
      </div>
    </ClientSessionCheck>
  )
}

function ProfileContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false)

  // Redirect if not authenticated
  if (status === 'loading' || !session?.user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      signOut({ callbackUrl: '/' })
      toast('Your account has been deleted successfully.')
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage('Failed to delete account. Please try again.')
      toast('Failed to delete account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1">{session.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1">{session.user.name || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsDeleteAccountModalOpen(true)}
            variant="outline"
            className="text-red-500 hover:text-red-600"
          >
            Delete Account
          </Button>
        </div>

        <ConfirmDialog
          isOpen={isDeleteAccountModalOpen}
          onClose={() => setIsDeleteAccountModalOpen(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you sure you want to delete your account? This action cannot be undone."
        />
      </div>

      {message && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">{message}</div>
      )}
    </div>
  )
}
