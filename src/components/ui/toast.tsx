import { useEffect } from 'react'
import { useToast } from './use-toast'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function Toast({ title, description, variant = 'default' }: ToastProps) {
  const { dismiss } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [dismiss])

  const variantClasses = {
    default: 'bg-white',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    error: 'bg-red-100',
  }

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${variantClasses[variant]}`}
      role="alert"
    >
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      {description && <p className="text-sm">{description}</p>}
    </div>
  )
}

export { useToast }
