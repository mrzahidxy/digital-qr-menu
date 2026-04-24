'use client'

import { useEffect, useMemo, useState } from 'react'
import { RESTAURANT_BRANDING_DEFAULTS } from '@/config/branding'
import type { OrderFormValues } from '@/validation/order-schema'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { subscribeBusinessMenuUpdates } from '@/lib/menu-update-signal'
import {
  createPublicOrder,
  getPublicMenu,
  type MenuItem,
} from '../api/public-order-client'
import { CartForm } from './CartForm'
import { MenuHero } from './menu-hero'
import { MenuNav } from './menu-nav'
import { MenuSection } from './menu-section'

type CartLine = {
  itemId: string
  itemName: string
  imageUrl: string | null
  quantity: number
}

type OrderConfirmation = {
  orderRef: string
}

const isEditorsChoice = (item: MenuItem) =>
  item.badges?.some((badge) => badge.label.toLowerCase().includes('editor')) ?? false

/**
 * PublicMenuPage component - Displays a public-facing menu page with ordering functionality
 */
export function PublicMenuPage() {
  // Extract URL search parameters to get business ID
  const params = useParams()
  const searchParams = useSearchParams()

  const businessIdFromUrl = searchParams.get('businessId') ?? undefined

  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const [activeSectionId, setActiveSectionId] = useState('')
  const [showRefreshButton, setShowRefreshButton] = useState(false)

  const businessIdFromParams =
    typeof params?.businessId === 'string'
      ? params.businessId
      : typeof params?.id === 'string'
        ? params.id
        : undefined

  const menuQuery = useQuery({
    queryKey: ['public-menu', businessIdFromUrl ?? businessIdFromParams ?? ''],
    queryFn: () =>
      getPublicMenu({
        businessId: businessIdFromUrl ?? businessIdFromParams,
      }),

    staleTime: 30_000,
  })

  const sections = useMemo(
    () => menuQuery.data?.sections ?? [],
    [menuQuery.data?.sections],
  )
  const businessId =
    menuQuery.data?.businessId ?? businessIdFromUrl ?? businessIdFromParams ?? ''

  useEffect(() => {
    const unsubscribe = subscribeBusinessMenuUpdates(businessId, () => {
      setShowRefreshButton(true)
    })

    return unsubscribe
  }, [businessId])

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId('')
      return
    }

    const hasActiveSection = sections.some((section) => section.id === activeSectionId)
    if (!hasActiveSection) {
      setActiveSectionId(sections[0].id)
    }
  }, [activeSectionId, sections])

  const cartLines = useMemo(() => Object.values(cart), [cart])
  const itemCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines],
  )

  const allMenuItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  )
  const editorsChoiceItems = useMemo(() => {
    const editorsItems = allMenuItems.filter(isEditorsChoice)
    if (editorsItems.length > 0) return editorsItems.slice(0, 3)
    return allMenuItems.slice(0, 3)
  }, [allMenuItems])

  const featuredHeroItem = editorsChoiceItems[0] ?? allMenuItems[0]
  const featuredGridItems = useMemo(
    () => allMenuItems.filter((item) => item.id !== featuredHeroItem?.id).slice(0, 3),
    [allMenuItems, featuredHeroItem?.id],
  )

  const primaryColor = menuQuery.data?.branding.primaryColor ?? '#0E7C86'
  const accentColor = menuQuery.data?.branding.accentColor ?? '#1B9C85'
  const textColor = menuQuery.data?.branding.textColor ?? '#0F172A'
  const fontFamily =
    menuQuery.data?.branding.fontFamily ?? 'Trebuchet MS, Segoe UI, sans-serif'

  const submitOrderMutation = useMutation({
    mutationFn: async (values: OrderFormValues) => {
      if (!businessId) {
        throw new Error('Missing published menu identifier in the QR link')
      }

      if (cartLines.length === 0) {
        throw new Error('Add at least one item to submit an order')
      }

      return createPublicOrder({
        businessId,
        guestName: values.guestName,
        tableLabel: values.tableLabel,
        orderNote: values.orderNote,
        items: cartLines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
        })),
      })
    },
    onSuccess: (response) => {
      setConfirmation({ orderRef: response.orderRef })
      setCart({})
      toast.success('Order received')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit order')
    },
  })

  const addItem = (item: MenuItem) => {
    if (item.isAvailable === false) return

    setCart((previous) => {
      const current = previous[item.id]
      return {
        ...previous,
        [item.id]: {
          itemId: item.id,
          itemName: item.name,
          imageUrl: item.imageUrl ?? null,
          quantity: current ? current.quantity + 1 : 1,
        },
      }
    })
  }

  const updateQuantity = (itemId: string, nextQuantity: number) => {
    setCart((previous) => {
      if (nextQuantity <= 0) {
        const clone = { ...previous }
        delete clone[itemId]
        return clone
      }

      const current = previous[itemId]
      if (!current) return previous

      return {
        ...previous,
        [itemId]: {
          ...current,
          quantity: nextQuantity,
        },
      }
    })
  }

  const removeItem = (itemId: string) => updateQuantity(itemId, 0)

  const getItemQuantity = (itemId: string) => cart[itemId]?.quantity ?? 0

  const isSubmitDisabled =
    cartLines.length === 0 || !businessId || menuQuery.isLoading || !!menuQuery.error

  const isInitialMenuLoading = menuQuery.isLoading && !menuQuery.data

  const handleSectionSelect = (sectionId: string) => {
    setActiveSectionId(sectionId)

    if (typeof window === 'undefined') return
    const sectionElement = document.getElementById(sectionId)
    sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isInitialMenuLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[1400px] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          Loading menu...
        </div>
      </main>
    )
  }

  return (
    <main
      className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-8 sm:px-6 lg:px-8"
      style={{ fontFamily, color: textColor }}
    >
      <MenuHero
        cafeName={menuQuery.data?.displayName ?? RESTAURANT_BRANDING_DEFAULTS.demoName}
        description={menuQuery.data?.description ?? undefined}
        location="Add items and submit your order"
        updatedAt="Live ordering"
        logoUrl={menuQuery.data?.branding.logoUrl}
        coverImageUrl={menuQuery.data?.branding.coverImageUrl}
        primaryColor={primaryColor}
        textColor={textColor}
        fontFamily={fontFamily}
      />

      {menuQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Unable to load the published menu. Order submission is disabled until the menu
          is available.
          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            onClick={() => void menuQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {showRefreshButton ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Menu was updated by the owner.
          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            onClick={async () => {
              await menuQuery.refetch()
              setShowRefreshButton(false)
            }}
          >
            Refresh menu
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="xl:sticky xl:top-4 xl:h-fit">
          <MenuNav
            sections={sections}
            activeSectionId={activeSectionId}
            onSelectSection={handleSectionSelect}
            accentColor={accentColor}
            fontFamily={fontFamily}
          />
        </aside>

        <section className="space-y-8">
          {menuQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading menu...
              </span>
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No published menu items are available right now.
            </div>
          ) : (
            <>
              {featuredGridItems.length > 0 ? (
                <section className="space-y-3" aria-labelledby="featured-items-title">
                  <h2
                    id="featured-items-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    Featured Items
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {featuredGridItems.map((item) => (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="h-40 w-full bg-slate-100">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-900">{item.name}</h3>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: accentColor }}
                            >
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{item.description}</p>
                          <Button
                            size="sm"
                            onClick={() => addItem(item)}
                            disabled={item.isAvailable === false}
                            style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                          >
                            {item.isAvailable === false ? 'Unavailable' : 'Add to Order'}
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="space-y-10">
                {sections.map((section) => (
                  <MenuSection
                    key={section.id}
                    section={section}
                    onAddItem={addItem}
                    getItemQuantity={getItemQuantity}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    textColor={textColor}
                    fontFamily={fontFamily}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
          <CartForm
            cartLines={cartLines}
            itemCount={itemCount}
            primaryColor={primaryColor}
            isSubmitting={submitOrderMutation.isPending}
            isSubmitDisabled={isSubmitDisabled}
            confirmationOrderRef={confirmation?.orderRef}
            onSubmit={(values) => submitOrderMutation.mutate(values)}
            onDecreaseItem={(itemId) =>
              updateQuantity(itemId, (cart[itemId]?.quantity ?? 0) - 1)
            }
            onIncreaseItem={(itemId) =>
              updateQuantity(itemId, (cart[itemId]?.quantity ?? 0) + 1)
            }
            onRemoveItem={removeItem}
          />
        </aside>
      </div>

      <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
        <p>Orders are submitted directly to staff with your selected items and note.</p>
      </footer>
    </main>
  )
}
