'use client'

import type { MenuSection } from '@/features/public-menu/api/public-order-client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type MenuSectionProps = {
  section: MenuSection
  onAddItem?: (item: MenuSection['items'][number]) => void
  getItemQuantity?: (itemId: string) => number
  primaryColor?: string
  accentColor?: string
  textColor?: string
  fontFamily?: string
}

export function MenuSection({
  section,
  onAddItem,
  getItemQuantity,
  primaryColor = '#0F766E',
  accentColor = '#0F766E',
  textColor = '#0F172A',
  fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif',
}: MenuSectionProps) {
  return (
    <section id={section.id} className="scroll-mt-24 space-y-5" style={{ color: textColor, fontFamily }}>
      <header className="space-y-2">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ borderColor: `${accentColor}4a`, color: accentColor, backgroundColor: `${accentColor}10` }}
        >
          <span>{section.title}</span>
        </div>
        {section.subtitle ? <p className="text-sm text-slate-500">{section.subtitle}</p> : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {section.items.map((item) => {
          const quantity = getItemQuantity?.(item.id) ?? 0
          const isPopular = item.badges?.some((badge) => badge.label.toLowerCase().includes('popular'))

          return (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-40 w-full bg-slate-100">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image</div>
                )}
                {isPopular ? (
                  <Badge className="absolute left-3 top-3 border-blue-200 bg-blue-50 text-blue-700" variant="outline">
                    Popular
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-3 p-4">
                <header className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                    <span className="text-base font-semibold" style={{ color: accentColor }}>
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </header>

                <footer className="flex flex-wrap items-center gap-2">
                  {item.badges
                    ?.filter((badge) => !badge.label.toLowerCase().includes('popular'))
                    .map((badge) => (
                      <Badge key={badge.label} variant={badge.variant ?? 'outline'}>
                        {badge.label}
                      </Badge>
                    ))}

                  {onAddItem ? (
                    <div className="ml-auto flex items-center gap-2">
                      {quantity > 0 ? <Badge variant="success">Qty {quantity}</Badge> : null}
                      <Button
                        size="sm"
                        onClick={() => onAddItem(item)}
                        disabled={item.isAvailable === false}
                        style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                        aria-label={`Add ${item.name} to order`}
                      >
                        {item.isAvailable === false ? 'Unavailable' : 'Add to Order'}
                      </Button>
                    </div>
                  ) : null}
                </footer>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
