'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <div className="text-red-500 mb-4">
        {errorMessage === 'CredentialsSignin'
          ? 'Invalid email or password'
          : 'An error occurred during authentication'}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  )
}
