'use client'

import { LogOut } from 'lucide-react'
import { forceLogout } from '@/lib/auth/session-cleanup'

export function SidebarLogoutLink() {
  const handleSignOut = () => {
    void forceLogout('unauthorized')
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      <span>Log Out</span>
    </button>
  )
}
