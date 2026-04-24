'use client'

import { Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'

type MenuHeaderProps = {
  updatedText: string
  activeItemCount: number
  previewHref?: string
}

export function MenuHeader({ updatedText, activeItemCount, previewHref }: MenuHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="pt-1">
        <p className="text-base text-muted-foreground">{updatedText} • {activeItemCount} active items</p>
      </div>
      {previewHref ? (
        <Button
          variant="secondary"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.open(previewHref, '_blank', 'noopener,noreferrer')
            }
          }}
        >
          <Eye className="h-4 w-4" />
          Preview menu
        </Button>
      ) : (
        <Button variant="secondary" disabled>
          <Eye className="h-4 w-4" />
          Preview menu
        </Button>
      )}
    </div>
  )
}
