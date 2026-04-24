'use client'

const menuUpdateKey = (businessId: string) => `menu:update:${businessId}`

export const markBusinessMenuUpdated = (businessId: string) => {
  if (typeof window === 'undefined' || !businessId) return
  window.localStorage.setItem(menuUpdateKey(businessId), String(Date.now()))
}

export const subscribeBusinessMenuUpdates = (
  businessId: string,
  listener: () => void
) => {
  if (typeof window === 'undefined') return () => undefined

  if (!businessId) {
    return () => undefined
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== menuUpdateKey(businessId)) return
    listener()
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener('storage', handleStorage)
  }
}
