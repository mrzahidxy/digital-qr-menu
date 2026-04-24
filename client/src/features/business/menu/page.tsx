'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Save } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api/upload-client'
import { getErrorMessage } from '@/lib/errors'
import { markBusinessMenuUpdated } from '@/lib/menu-update-signal'

import {
  getBusinessMenu,
  updateBusinessMenu,
  type BusinessMenuCategory,
  type BusinessMenuConfig,
  type BusinessMenuItem,
} from '../api/business-client'
import { SectionCard } from '../dashboard/components/section-card'
import { MenuCategorySection } from './components/menu-category-section'
import { MenuHeader } from './components/menu-header'

const EMPTY_MENU: BusinessMenuConfig = {
  businessId: '',
  menuId: '',
  categories: [],
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createEmptyItem = (categoryId: string): BusinessMenuItem => ({
  id: createId('item'),
  categoryId,
  name: '',
  description: '',
  price: 0,
  isAvailable: true,
  badge: 'NONE',
  photoUrl: '',
})

const formatLastUpdated = (value?: string) => {
  if (!value) return 'Updated just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Updated recently'

  const diffInMs = parsed.getTime() - Date.now()
  const diffInHours = Math.round(diffInMs / (1000 * 60 * 60))
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffInHours) < 24) {
    return `Updated ${formatter.format(diffInHours, 'hour')}`
  }

  const diffInDays = Math.round(diffInHours / 24)
  return `Updated ${formatter.format(diffInDays, 'day')}`
}

const validateMenuDraft = (draft: BusinessMenuConfig) => {
  for (let categoryIndex = 0; categoryIndex < draft.categories.length; categoryIndex += 1) {
    const category = draft.categories[categoryIndex]
    const categoryLabel = `Category ${categoryIndex + 1}`

    if (!category.name.trim()) {
      return `${categoryLabel} needs a name before saving.`
    }

    for (let itemIndex = 0; itemIndex < category.items.length; itemIndex += 1) {
      const item = category.items[itemIndex]
      const itemLabel = `${category.name.trim()} item ${itemIndex + 1}`

      if (!item.name.trim()) {
        return `${itemLabel} needs a name before saving.`
      }

      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) {
        return `${itemLabel} needs a valid price.`
      }
    }
  }

  return null
}

export default function MenuPage() {
  const { data: session } = useSession()
  const businessId = session?.user?.businessId ?? null
  const [draft, setDraft] = useState<BusinessMenuConfig>(EMPTY_MENU)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>({})
  const [uploadingItemIds, setUploadingItemIds] = useState<Record<string, boolean>>({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(undefined)

  const menuQuery = useQuery({
    queryKey: ['business-owner', 'menu', businessId],
    queryFn: () => getBusinessMenu(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!menuQuery.data) return
    setDraft({
      businessId: menuQuery.data.businessId,
      menuId: menuQuery.data.menuId,
      categories: menuQuery.data.categories ?? [],
    })
    setLastUpdatedAt(menuQuery.data.updatedAt)
    setCollapsedCategoryIds(
      (menuQuery.data.categories ?? []).reduce<Record<string, boolean>>((accumulator, category) => {
        accumulator[category.id] = false
        return accumulator
      }, {})
    )
  }, [menuQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: BusinessMenuConfig) => updateBusinessMenu(businessId ?? '', payload),
    onSuccess: (data) => {
      setDraft({
        businessId: data.businessId,
        menuId: data.menuId,
        categories: data.categories ?? [],
      })
      setLastUpdatedAt(data.updatedAt ?? new Date().toISOString())
      if (businessId) {
        markBusinessMenuUpdated(businessId)
      }
      toast.success('Menu saved successfully')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save menu'))
    },
  })

  const setCategory = (
    categoryId: string,
    updater: (category: BusinessMenuCategory) => BusinessMenuCategory
  ) => {
    setDraft((previous) => ({
      businessId: previous.businessId,
      menuId: previous.menuId,
      categories: previous.categories.map((category) =>
        category.id === categoryId ? updater(category) : category
      ),
    }))
  }

  const addCategory = () => {
    const categoryId = createId('category')
    setDraft((previous) => ({
      businessId: previous.businessId,
      menuId: previous.menuId,
      categories: [
        ...previous.categories,
        {
          id: categoryId,
          menuId: previous.menuId,
          name: '',
          description: '',
          items: [],
        },
      ],
    }))
    setCollapsedCategoryIds((previous) => ({ ...previous, [categoryId]: false }))
  }

  const removeCategory = (categoryId: string) => {
    setDraft((previous) => ({
      businessId: previous.businessId,
      menuId: previous.menuId,
      categories: previous.categories.filter((category) => category.id !== categoryId),
    }))
    setCollapsedCategoryIds((previous) => {
      const next = { ...previous }
      delete next[categoryId]
      return next
    })
  }

  const addItem = (categoryId: string) => {
    setCategory(categoryId, (category) => ({
      ...category,
      items: [...category.items, createEmptyItem(category.id)],
    }))
  }

  const removeItem = (categoryId: string, itemId: string) => {
    setCategory(categoryId, (category) => ({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    }))
  }

  const setItem = (
    categoryId: string,
    itemId: string,
    updater: (item: BusinessMenuItem) => BusinessMenuItem
  ) => {
    setCategory(categoryId, (category) => ({
      ...category,
      items: category.items.map((item) => (item.id === itemId ? updater(item) : item)),
    }))
  }

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategoryIds((previous) => ({
      ...previous,
      [categoryId]: !previous[categoryId],
    }))
  }

  const uploadItemImage = async (categoryId: string, itemId: string, file: File) => {
    if (!businessId) {
      toast.error('Business not found for current session')
      return
    }

    setUploadingItemIds((previous) => ({ ...previous, [itemId]: true }))
    try {
      const uploaded = await uploadFile(file)
      setItem(categoryId, itemId, (current) => ({ ...current, photoUrl: uploaded.url }))
      toast.success('Item image uploaded')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload image'))
    } finally {
      setUploadingItemIds((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
    }
  }

  const visibleCategories = useMemo(
    () =>
      draft.categories.map((category) => ({
        ...category,
        totalItemCount: category.items.length,
      })),
    [draft.categories]
  )

  const allItems = useMemo(
    () => draft.categories.flatMap((category) => category.items),
    [draft.categories]
  )
  const activeItems = useMemo(
    () => allItems.filter((item) => item.isAvailable),
    [allItems]
  )

  if (!businessId) {
    return (
      <SectionCard title="Menu" subtitle="Business not found for current session.">
        <p className="text-sm text-muted-foreground">
          Sign in with an owner or staff account linked to a business.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="app-toolbar">
        <div className="flex w-full items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-11"
              onClick={() => {
                const validationMessage = validateMenuDraft(draft)
                if (validationMessage) {
                  toast.error(validationMessage)
                  return
                }

                saveMutation.mutate(draft)
              }}
              disabled={saveMutation.isPending || menuQuery.isLoading}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      <MenuHeader
        updatedText={formatLastUpdated(lastUpdatedAt)}
        activeItemCount={activeItems.length}
        previewHref={businessId ? `/menu/${encodeURIComponent(businessId)}` : undefined}
      />

      <section className="space-y-8">
        {menuQuery.isLoading ? (
          <div className="app-muted-card text-sm text-muted-foreground">Loading menu...</div>
        ) : menuQuery.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            Unable to load menu data right now.
            <Button className="ml-3" variant="outline" onClick={() => void menuQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : draft.categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
            No menu categories yet. Create your first category to start publishing items.
          </div>
        ) : (
          visibleCategories.map((category) => (
            <MenuCategorySection
              key={category.id}
              category={category}
              itemCount={category.totalItemCount}
              isCollapsed={Boolean(collapsedCategoryIds[category.id])}
              uploadingItemIds={uploadingItemIds}
              onToggleCollapse={() => toggleCategoryCollapse(category.id)}
              onUpdateCategory={(updater) => setCategory(category.id, updater)}
              onAddItem={() => addItem(category.id)}
              onRemoveCategory={() => removeCategory(category.id)}
              onUpdateItem={(itemId, updater) => setItem(category.id, itemId, updater)}
              onUploadItemImage={(itemId, file) => uploadItemImage(category.id, itemId, file)}
              onRemoveItem={(itemId) => removeItem(category.id, itemId)}
            />
          ))
        )}

        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-5 text-left text-xl font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          onClick={addCategory}
        >
          <Plus className="h-5 w-5" />
          Create New Category
        </button>
      </section>

    </div>
  )
}
