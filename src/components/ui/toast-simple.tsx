'use client'

import { useEffect, useState } from 'react'

export type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  duration?: number
}

export function Toast({ title, description, variant = 'default', duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  if (!isVisible) return null

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

let toastId = 0
const toasts: Map<number, (props: ToastProps) => void> = new Map()

export function showToast(props: ToastProps) {
  const id = toastId++
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: { id, props } })
    window.dispatchEvent(event)
  }
  return id
}

export function useToast() {
  const [activeToasts, setActiveToasts] = useState<Array<{ id: number; props: ToastProps }>>([])

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const { id, props } = (event as CustomEvent).detail
      setActiveToasts((prev) => [...prev, { id, props }])
    }

    window.addEventListener('show-toast', handleShowToast)
    return () => window.removeEventListener('show-toast', handleShowToast)
  }, [])

  return {
    toasts: activeToasts,
    toast: (props: ToastProps) => showToast(props),
    dismiss: (id: number) => {
      setActiveToasts((prev) => prev.filter((toast) => toast.id !== id))
    },
  }
}

export function ToastContainer() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(({ id, props }) => (
        <Toast key={id} {...props} />
      ))}
    </>
  )
}
