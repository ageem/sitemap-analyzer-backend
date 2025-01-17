'use client'

import { useToast } from './use-toast'
import { Toast } from './toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} title={title} description={description} variant={variant} />
      ))}
    </div>
  )
}
