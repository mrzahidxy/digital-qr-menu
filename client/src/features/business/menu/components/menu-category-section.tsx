'use client'

import { ChevronDown, ChevronRight, MoreVertical, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { BusinessMenuCategory, BusinessMenuItem } from '@/features/business/api/business-client'

import { MenuItemRow } from './menu-item-row'

type MenuCategorySectionProps = {
  category: BusinessMenuCategory
  itemCount: number
  isCollapsed: boolean
  uploadingItemIds: Record<string, boolean>
  onToggleCollapse: () => void
  onUpdateCategory: (updater: (category: BusinessMenuCategory) => BusinessMenuCategory) => void
  onAddItem: () => void
  onRemoveCategory: () => void
  onUpdateItem: (itemId: string, updater: (item: BusinessMenuItem) => BusinessMenuItem) => void
  onUploadItemImage: (itemId: string, file: File) => void
  onRemoveItem: (itemId: string) => void
}

export function MenuCategorySection({
  category,
  itemCount,
  isCollapsed,
  uploadingItemIds,
  onToggleCollapse,
  onUpdateCategory,
  onAddItem,
  onRemoveCategory,
  onUpdateItem,
  onUploadItemImage,
  onRemoveItem,
}: MenuCategorySectionProps) {
  return (
    <section className="app-card space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={isCollapsed ? 'Expand category' : 'Collapse category'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Input
            value={category.name}
            placeholder="Category name"
            onChange={(event) => {
              const value = event.target.value
              onUpdateCategory((current) => ({ ...current, name: value }))
            }}
            className="h-9 border-none bg-transparent px-0 text-xl font-semibold tracking-tight text-foreground shadow-none focus-visible:ring-0 sm:text-2xl"
          />
          <Badge variant="default" className="rounded-full border-primary/30 bg-primary-soft text-primary">
            {itemCount}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-9 text-primary hover:bg-primary-soft hover:text-primary-hover"
            onClick={onAddItem}
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Category actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600"
                onSelect={(event) => {
                  event.preventDefault()
                  onRemoveCategory()
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isCollapsed ? (
        category.items.length > 0 ? (
          <div className="space-y-2">
            {category.items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                isUploadingImage={Boolean(uploadingItemIds[item.id])}
                onChange={(updater) => onUpdateItem(item.id, updater)}
                onUploadImage={(file) => onUploadItemImage(item.id, file)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted-foreground">
            No items yet in this category.
          </div>
        )
      ) : null}
    </section>
  )
}
