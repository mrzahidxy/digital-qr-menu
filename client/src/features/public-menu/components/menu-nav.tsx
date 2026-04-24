'use client'

import type { LucideIcon } from 'lucide-react'
import { Coffee, Cookie, Leaf, Sparkles } from 'lucide-react'

import type { MenuSection } from '@/features/public-menu/api/public-order-client'

type MenuNavProps = {
  sections: MenuSection[]
  activeSectionId?: string
  onSelectSection?: (sectionId: string) => void
  accentColor?: string
  fontFamily?: string
}

const resolveIcon = (title: string): LucideIcon => {
  const value = title.toLowerCase()

  if (value.includes('coffee')) return Coffee
  if (value.includes('tea')) return Leaf
  if (value.includes('dessert') || value.includes('bake') || value.includes('pastr')) return Cookie
  if (value.includes('season')) return Sparkles

  return Coffee
}

export function MenuNav({
  sections,
  activeSectionId,
  onSelectSection,
  accentColor = '#0F766E',
  fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif',
}: MenuNavProps) {
  return (
    <nav
      aria-label="Menu categories"
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      style={{ fontFamily }}
    >
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Categories</p>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1" role="tablist" aria-orientation="vertical">
        {sections.map((section) => {
          const Icon = resolveIcon(section.title)
          const isActive = activeSectionId === section.id

          return (
            <li key={section.id}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={section.id}
                onClick={() => onSelectSection?.(section.id)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  borderColor: isActive ? accentColor : '#e2e8f0',
                  backgroundColor: isActive ? `${accentColor}14` : '#ffffff',
                  color: isActive ? accentColor : '#334155',
                }}
              >
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: isActive ? `${accentColor}1f` : '#f1f5f9' }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>{section.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
