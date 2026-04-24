'use client'

import { ChangeEvent } from 'react'
import { ImageOff, Loader2, MoreVertical, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { BusinessMenuItem } from '@/features/business/api/business-client'

type MenuItemRowProps = {
  item: BusinessMenuItem
  isUploadingImage: boolean
  onChange: (updater: (current: BusinessMenuItem) => BusinessMenuItem) => void
  onUploadImage: (file: File) => void
  onRemove: () => void
}

export function MenuItemRow({
  item,
  isUploadingImage,
  onChange,
  onUploadImage,
  onRemove,
}: MenuItemRowProps) {
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onUploadImage(file)
    event.target.value = ''
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-surface px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_80px_auto_auto_auto]">
      <div className="flex min-w-0 items-center gap-3">
        {item.photoUrl ? (
          <img
            src={item.photoUrl}
            alt={item.name || 'Menu item'}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <ImageOff className="h-4 w-4" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={item.name}
            placeholder="Item name"
            onChange={(event) => {
              const value = event.target.value
              onChange((current) => ({ ...current, name: value }))
            }}
            className="h-8 border-none bg-transparent px-0 text-base font-semibold text-foreground shadow-none focus-visible:ring-0"
          />
          <Input
            value={item.description ?? ''}
            placeholder="Short description"
            onChange={(event) => {
              const value = event.target.value
              onChange((current) => ({ ...current, description: value }))
            }}
            className="h-7 border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <Input
        type="number"
        step="0.01"
        min="0"
        value={Number(item.price)}
        onChange={(event) => {
          const value = Number(event.target.value) || 0
          onChange((current) => ({ ...current, price: value }))
        }}
        className="h-9 w-28 border-input text-right text-base font-semibold text-foreground"
      />

      <Badge variant={item.isAvailable ? 'success' : 'warning'} className="justify-center">
        {item.isAvailable ? 'Live' : 'Offline'}
      </Badge>

      <label className="inline-flex items-center">
        <Switch
          checked={Boolean(item.isAvailable)}
          onChange={(event) => {
            const checked = event.currentTarget.checked
            onChange((current) => ({ ...current, isAvailable: checked }))
          }}
        />
      </label>

      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
        {isUploadingImage ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>{isUploadingImage ? 'Uploading...' : 'Image'}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
          disabled={isUploadingImage}
        />
      </label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Item actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600"
            onSelect={(event) => {
              event.preventDefault()
              onRemove()
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
