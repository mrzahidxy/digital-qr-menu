'use client'

import { PLATFORM_BRANDING, RESTAURANT_BRANDING_DEFAULTS } from '@/config/branding'

type MenuHeroProps = {
  cafeName?: string
  location?: string
  updatedAt?: string
  description?: string
  logoUrl?: string | null
  coverImageUrl?: string | null
  primaryColor?: string
  textColor?: string
  fontFamily?: string
}

export function MenuHero({
  cafeName = RESTAURANT_BRANDING_DEFAULTS.demoName,
  location = RESTAURANT_BRANDING_DEFAULTS.demoLocation,
  updatedAt = RESTAURANT_BRANDING_DEFAULTS.defaultUpdatedLabel,
  description,
  logoUrl,
  coverImageUrl,
  primaryColor = '#0F766E',
  textColor = '#0F172A',
  fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif',
}: MenuHeroProps) {
  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 text-slate-900 shadow-lg"
      style={{
        color: textColor,
        fontFamily,
        background: coverImageUrl
          ? `linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.35)), url(${coverImageUrl}) center / cover`
          : `linear-gradient(135deg, ${primaryColor}16, #ffffff)`,
      }}
    >
      <div className="absolute inset-0 bg-[url('/menu-texture.png')] bg-cover bg-center opacity-5" />
      <div className="relative flex flex-col gap-6 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:py-16">
        <div className="space-y-4 sm:max-w-xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span>{PLATFORM_BRANDING.name}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>{updatedAt}</span>
          </div>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${cafeName} logo`} className="h-12 w-12 rounded-full border border-white/60 object-cover shadow-sm" />
            ) : null}
            <h1 className="text-3xl font-semibold sm:text-4xl">{cafeName}</h1>
          </div>
          <p className="text-sm text-slate-600 sm:text-base">{location}</p>
          {description ? <p className="max-w-2xl text-sm text-slate-700 sm:text-base">{description}</p> : null}

        </div>
      </div>
    </header>
  )
}
