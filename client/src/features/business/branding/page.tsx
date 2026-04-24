'use client'

import { useEffect, useMemo, useState } from 'react'
import { RESTAURANT_BRANDING_DEFAULTS } from '@/config/branding'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Globe2,
  Palette,
  Save,
  Type,
} from 'lucide-react'
import type { Route } from 'next'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UploadImage } from '@/components/upload/UploadImage'
import { formatCurrency } from '@/lib/format'
import {
  getBusinessBranding,
  getBusinessMenu,
  getBusinessQr,
  updateBusinessBranding,
  updateBusinessQr,
  type BusinessBrandingConfig,
  type BusinessQrConfig,
} from '../api/business-client'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'

type ColorPreset = {
  id: string
  label: string
  primaryColor: string
  accentColor: string
}

type FontPreset = {
  id: BusinessBrandingConfig['typographyPreset']
  label: string
  preview: string
  fontFamily: string
}

type BrandingTab = 'branding' | 'qr'

const QR_EXPORT_OPTIONS = [
  { label: 'Small', size: 256 },
  { label: 'Medium', size: 512 },
  { label: 'Large', size: 1024 },
] as const

const DEFAULT_BRANDING: BusinessBrandingConfig = {
  name: RESTAURANT_BRANDING_DEFAULTS.demoName,
  description: '',
  logoUrl: '',
  coverImageUrl: '',
  primaryColor: '#0E7C86',
  accentColor: '#1B9C85',
  typographyPreset: 'modern-sans',
}

const DEFAULT_QR: BusinessQrConfig = {
  isPublished: true,
  isEnabled: true,
  slug: 'menu',
  basePath: '/menu',
  includeTableParam: false,
  tableParamKey: 'table',
  defaultTableCount: 1,
  qrForeground: '#0F172A',
  qrBackground: '#FFFFFF',
  foregroundColor: '#0F172A',
  backgroundColor: '#FFFFFF',
  includeLogo: true,
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'nordic',
    label: 'Nordic',
    primaryColor: '#0E7C86',
    accentColor: '#1B9C85',
  },
  {
    id: 'warm',
    label: 'Warm',
    primaryColor: '#C96B18',
    accentColor: '#F59E0B',
  },
  {
    id: 'classic',
    label: 'Classic',
    primaryColor: '#1E293B',
    accentColor: '#475569',
  },
  {
    id: 'fresh',
    label: 'Fresh',
    primaryColor: '#0F9F6E',
    accentColor: '#22C55E',
  },
]

const FONT_PRESETS: FontPreset[] = [
  {
    id: 'modern-sans',
    label: 'Modern Sans',
    preview: 'The quick brown fox jumps',
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
  },
  {
    id: 'classic-serif',
    label: 'Classic Serif',
    preview: 'The quick brown fox jumps',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'friendly-round',
    label: 'Friendly Round',
    preview: 'The quick brown fox jumps',
    fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
  },
  {
    id: 'bold-impact',
    label: 'Bold Impact',
    preview: 'The quick brown fox jumps',
    fontFamily: 'Impact, "Arial Black", sans-serif',
  },
]

const fieldLabelClassName = 'mb-2 block text-sm font-medium text-slate-900'

const BRANDING_TABS: ReadonlyArray<{
  id: BrandingTab
  label: string
  description: string
}> = [
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, colors, typography, and menu presentation.',
  },
  {
    id: 'qr',
    label: 'QR',
    description: 'Publishing controls, QR links, and print-ready entry settings.',
  },
]

const isBrandingTab = (value: string | null): value is BrandingTab =>
  value === 'branding' || value === 'qr'

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (parts.length === 0) {
    return 'BO'
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return 'Not saved yet'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not saved yet'
  }

  return date.toLocaleString()
}

export default function BrandingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const businessId = session?.user?.businessId ?? null
  const tabFromSearch = searchParams.get('tab')
  const resolvedTab: BrandingTab = isBrandingTab(tabFromSearch)
    ? tabFromSearch
    : 'branding'
  const [activeTab, setActiveTab] = useState<BrandingTab>(resolvedTab)
  const [brandingDraft, setBrandingDraft] =
    useState<BusinessBrandingConfig>(DEFAULT_BRANDING)
  const [qrDraft, setQrDraft] = useState<BusinessQrConfig>(DEFAULT_QR)

  useEffect(() => {
    setActiveTab(resolvedTab)
  }, [resolvedTab])

  const brandingQuery = useQuery({
    queryKey: ['business-owner', 'branding', businessId],
    queryFn: () => getBusinessBranding(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })

  const qrQuery = useQuery({
    queryKey: ['business-owner', 'qr', businessId],
    queryFn: () => getBusinessQr(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })

  const menuQuery = useQuery({
    queryKey: ['business-owner', 'menu', businessId],
    queryFn: () => getBusinessMenu(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (brandingQuery.data) {
      setBrandingDraft({
        ...DEFAULT_BRANDING,
        ...brandingQuery.data,
        description: brandingQuery.data.description ?? '',
        logoUrl: brandingQuery.data.logoUrl ?? '',
        coverImageUrl: brandingQuery.data.coverImageUrl ?? '',
      })
    }
  }, [brandingQuery.data])

  useEffect(() => {
    if (qrQuery.data) {
      setQrDraft({
        ...DEFAULT_QR,
        ...qrQuery.data,
      })
    }
  }, [qrQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (tab: BrandingTab) => {
      if (tab === 'branding') {
        const branding = await updateBusinessBranding(businessId ?? '', brandingDraft)
        return { tab, branding }
      }

      const qr = await updateBusinessQr(businessId ?? '', qrDraft)
      return { tab, qr }
    },
    onSuccess: (result) => {
      if (result.tab === 'branding' && result.branding) {
        setBrandingDraft({
          ...result.branding,
          description: result.branding.description ?? '',
          logoUrl: result.branding.logoUrl ?? '',
          coverImageUrl: result.branding.coverImageUrl ?? '',
        })
      }

      if (result.tab === 'qr' && result.qr) {
        setQrDraft({
          ...DEFAULT_QR,
          ...result.qr,
        })
      }

      toast.success(
        result.tab === 'branding' ? 'Branding settings saved' : 'QR settings saved',
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save branding settings',
      )
    },
  })

  const selectedFontPreset = useMemo(
    () =>
      FONT_PRESETS.find((preset) => preset.id === brandingDraft.typographyPreset) ??
      FONT_PRESETS[0],
    [brandingDraft.typographyPreset],
  )

  const previewMenuItems = useMemo(
    () =>
      (menuQuery.data?.categories ?? [])
        .flatMap((category) => category.items)
        .filter((item) => item.isAvailable)
        .slice(0, 3),
    [menuQuery.data?.categories],
  )

  const qrExportOptions = QR_EXPORT_OPTIONS
  const previewQrSize =
    qrExportOptions.find((option) => option.size >= 320)?.size ??
    qrExportOptions[0]?.size ??
    320

  const appOrigin = typeof window === 'undefined' ? '' : window.location.origin

  const publicBaseUrl = useMemo(() => {
    if (!businessId) {
      return ''
    }

    return `${appOrigin}/menu/${encodeURIComponent(businessId)}`
  }, [appOrigin, businessId])

  const lastUpdated = brandingQuery.data?.updatedAt ?? qrQuery.data?.updatedAt
  const isLoading = brandingQuery.isLoading || qrQuery.isLoading

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Unable to copy')
    }
  }

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const toQrApiColor = (value: string) => value.replace('#', '')

  const buildQrUrl = (size: number, format: 'png' | 'svg') => {
    if (!publicBaseUrl) return ''
    const params = new URLSearchParams({
      size: `${size}x${size}`,
      format,
      data: publicBaseUrl,
      color: toQrApiColor(qrDraft.foregroundColor!),
      bgcolor: toQrApiColor(qrDraft.backgroundColor!),
      qzone: '1',
    })
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
  }

  const downloadQr = async (format: 'png' | 'svg', size: number, sizeLabel: string) => {
    const url = buildQrUrl(size, format)
    if (!url) {
      toast.error('Menu URL is not available yet')
      return
    }

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('QR service failed')
      const blob = await response.blob()
      downloadBlob(`menu-qr-${size}.${format}`, blob)
      toast.success(`${format.toUpperCase()} downloaded (${sizeLabel})`)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.message('Opened QR in new tab. Use browser save/download if needed.')
    }
  }

  const handleTabChange = (tab: BrandingTab) => {
    setActiveTab(tab)

    const nextParams = new URLSearchParams(searchParams.toString())
    if (tab === 'branding') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', tab)
    }

    const query = nextParams.toString()
    const nextHref = (query ? `${pathname}?${query}` : pathname) as Route
    router.replace(nextHref, { scroll: false })
  }

  const validateBrandingSettings = () => {
    if (!brandingDraft.name.trim()) {
      toast.error('Display name is required')
      return false
    }

    const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value)
    if (
      !isHexColor(brandingDraft.primaryColor) ||
      !isHexColor(brandingDraft.accentColor)
    ) {
      toast.error('Please use valid hex colors like #0F172A')
      return false
    }

    return true
  }

  const resetBrandingDraft = () => {
    if (brandingQuery.data) {
      setBrandingDraft({
        ...DEFAULT_BRANDING,
        ...brandingQuery.data,
        description: brandingQuery.data.description ?? '',
        logoUrl: brandingQuery.data.logoUrl ?? '',
        coverImageUrl: brandingQuery.data.coverImageUrl ?? '',
      })
      return
    }

    setBrandingDraft(DEFAULT_BRANDING)
  }

  if (!businessId) {
    return (
      <SectionCard title="Branding" subtitle="Business not found for current session.">
        <p className="text-sm text-slate-500">
          Sign in with an owner or staff account linked to a business.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Branding & QR"
        description="Manage the business identity, public menu link, and QR downloads from one place."
        actions={
          activeTab === 'branding' ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={resetBrandingDraft}
                disabled={saveMutation.isPending}
              >
                Reset changes
              </Button>
              <Button
                onClick={() => {
                  if (!validateBrandingSettings()) {
                    return
                  }

                  saveMutation.mutate('branding')
                }}
                disabled={saveMutation.isPending || isLoading}
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          ) : null
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading branding and QR settings...</p>
      ) : null}
      {brandingQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Unable to load branding data. You can continue editing with fallback defaults.
        </div>
      ) : null}
      {qrQuery.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          QR settings are temporarily unavailable. QR sections are showing fallback
          values.
        </div>
      ) : null}

      <SectionCard
        title="Publishing Status"
        subtitle="Current state of your public menu and QR entry point."
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {qrDraft.isEnabled ? 'Menu Published' : 'Publishing Paused'}
              </p>
              <p className="text-sm text-slate-500">
                Last updated {formatUpdatedAt(lastUpdated)} •{' '}
                {saveMutation.isPending ? 'Saving changes' : 'All changes synced'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={qrDraft.isEnabled ? 'success' : 'warning'}>
              {qrDraft.isEnabled ? 'Published' : 'Disabled'}
            </Badge>
            <Badge variant="outline">Branding + QR</Badge>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Workspace Sections"
        subtitle="Switch between branding identity and QR sharing tools."
      >
        <div className="space-y-3">
          <div
            className="grid gap-2 sm:grid-cols-2"
            role="tablist"
            aria-label="Branding and QR sections"
          >
            {BRANDING_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className="w-full"
                >
                  {tab.label}
                </Button>
              )
            })}
          </div>

          <p className="text-sm text-slate-500">
            {BRANDING_TABS.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>
      </SectionCard>

      {activeTab === 'branding' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <SectionCard
              title="Business Information"
              subtitle="Core details shown on your digital menu."
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className={fieldLabelClassName} htmlFor="name">
                    Cafe Name
                  </label>
                  <Input
                    id="name"
                    value={brandingDraft.name}
                    placeholder={RESTAURANT_BRANDING_DEFAULTS.demoName}
                    onChange={(event) =>
                      setBrandingDraft((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className={fieldLabelClassName} htmlFor="description">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={brandingDraft.description ?? ''}
                    placeholder="Tell customers about your cafe..."
                    onChange={(event) =>
                      setBrandingDraft((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Logo & Images"
              subtitle="Upload branded images or paste an existing Cloudinary URL."
            >
              <div className="space-y-5">
                <UploadImage
                  id="logoUrl"
                  label="Logo"
                  value={brandingDraft.logoUrl ?? ''}
                  placeholder="https://res.cloudinary.com/.../logo.png"
                  previewAlt={`${brandingDraft.name || 'Business'} logo`}
                  previewVariant="circle"
                  disabled={saveMutation.isPending}
                  onChange={(logoUrl) =>
                    setBrandingDraft((previous) => ({ ...previous, logoUrl }))
                  }
                />

                <UploadImage
                  id="coverImageUrl"
                  label="Cover Image"
                  value={brandingDraft.coverImageUrl ?? ''}
                  placeholder="https://res.cloudinary.com/.../cover.jpg"
                  previewAlt={`${brandingDraft.name || 'Business'} cover image`}
                  previewVariant="wide"
                  disabled={saveMutation.isPending}
                  onChange={(coverImageUrl) =>
                    setBrandingDraft((previous) => ({ ...previous, coverImageUrl }))
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Brand Colors"
              subtitle="Choose your main brand colors and quick presets."
              icon={<Palette className="h-5 w-5" />}
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className={fieldLabelClassName} htmlFor="primaryColor">
                    Primary Color
                  </label>
                  <div className="flex gap-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={brandingDraft.primaryColor}
                      className="h-12 w-16 p-1"
                      onChange={(event) =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          primaryColor: event.target.value,
                        }))
                      }
                    />
                    <Input
                      value={brandingDraft.primaryColor}
                      placeholder="#0E7C86"
                      onChange={(event) =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          primaryColor: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={fieldLabelClassName} htmlFor="accentColor">
                    Accent Color
                  </label>
                  <div className="flex gap-3">
                    <Input
                      id="accentColor"
                      type="color"
                      value={brandingDraft.accentColor}
                      className="h-12 w-16 p-1"
                      onChange={(event) =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          accentColor: event.target.value,
                        }))
                      }
                    />
                    <Input
                      value={brandingDraft.accentColor}
                      placeholder="#1B9C85"
                      onChange={(event) =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          accentColor: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-900">Color Presets</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          primaryColor: preset.primaryColor,
                          accentColor: preset.accentColor,
                        }))
                      }
                      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
                    >
                      <div className="mb-3 flex gap-2">
                        <span
                          className="h-6 w-6 rounded-md"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="h-6 w-6 rounded-md"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-900">{preset.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Typography"
              subtitle="Use a simple preset instead of a full font management system."
              icon={<Type className="h-5 w-5" />}
            >
              <div className="grid gap-4">
                {FONT_PRESETS.map((preset) => {
                  const isSelected = brandingDraft.typographyPreset === preset.id

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setBrandingDraft((previous) => ({
                          ...previous,
                          typographyPreset: preset.id,
                        }))
                      }
                      className={`rounded-2xl border p-5 text-left transition ${
                        isSelected
                          ? 'border-teal-400 bg-teal-50/60'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-base font-medium text-slate-900">
                        {preset.label}
                      </p>
                      <p
                        className="mt-3 text-[15px] text-slate-600"
                        style={{ fontFamily: preset.fontFamily }}
                      >
                        {preset.preview}
                      </p>
                    </button>
                  )
                })}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
            <SectionCard
              title="Live Menu Preview"
              subtitle="A lightweight preview of your public menu card."
              icon={<Eye className="h-5 w-5" />}
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div
                  className="overflow-hidden rounded-[24px]"
                  style={{
                    background: brandingDraft.coverImageUrl
                      ? `linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.3)), url(${brandingDraft.coverImageUrl}) center / cover`
                      : `linear-gradient(135deg, ${brandingDraft.primaryColor}, ${brandingDraft.accentColor})`,
                  }}
                >
                  <div
                    className="p-6"
                    style={{
                      color: '#FFFFFF',
                      fontFamily: selectedFontPreset.fontFamily,
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-medium backdrop-blur-sm">
                      {brandingDraft.logoUrl ? (
                        <img
                          src={brandingDraft.logoUrl}
                          alt={`${brandingDraft.name} logo`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(brandingDraft.name)
                      )}
                    </div>
                    <h3 className="mt-6 text-[30px] leading-tight">
                      {brandingDraft.name || 'Business Owner'}
                    </h3>
                    {brandingDraft.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-white/90">
                        {brandingDraft.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {menuQuery.isLoading ? (
                    <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                      Loading menu items...
                    </div>
                  ) : menuQuery.error ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Menu items are unavailable right now.
                    </div>
                  ) : previewMenuItems.length > 0 ? (
                    previewMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="truncate font-medium"
                              style={{
                                fontFamily: selectedFontPreset.fontFamily,
                              }}
                            >
                              {item.name}
                            </p>
                            {item.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                          <p
                            className="shrink-0 text-sm font-semibold"
                            style={{ color: brandingDraft.accentColor }}
                          >
                            {formatCurrency(Number(item.price))}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                      No available menu items yet.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="mt-4 h-11 w-full rounded-xl text-sm font-semibold text-white"
                  style={{
                    backgroundColor: brandingDraft.primaryColor,
                    fontFamily: selectedFontPreset.fontFamily,
                  }}
                  onClick={() => {
                    const href = `/menu/${encodeURIComponent(businessId)}` as Route
                    router.push(href)
                  }}
                >
                  View Full Menu
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200  px-4 py-3 text-sm text-slate-600">
                Changes apply after save. This preview uses your available menu items and
                current brand settings.
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <SectionCard
            title="Public Menu URL"
            subtitle="Copy and open your public menu link."
            icon={<Globe2 className="h-5 w-5" />}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <label className={fieldLabelClassName} htmlFor="baseMenuUrl">
                  Your menu link
                </label>
                <div className="flex gap-3">
                  <Input id="baseMenuUrl" value={publicBaseUrl} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copy(publicBaseUrl)}
                    disabled={!publicBaseUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!publicBaseUrl) return
                      window.open(publicBaseUrl, '_blank', 'noopener,noreferrer')
                    }}
                    disabled={!publicBaseUrl}
                  >
                    Open Menu
                  </Button>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Share this link directly or scan the QR preview.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="mb-4 text-sm font-medium text-slate-900">QR Code Preview</p>
                <div
                  className="flex h-64 items-center justify-center rounded-[28px] border border-slate-100"
                  style={{ backgroundColor: qrDraft.backgroundColor }}
                >
                  <img
                    src={buildQrUrl(previewQrSize, 'png')}
                    alt="Menu QR code"
                    className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  />
                </div>
                <p className="mt-4 text-center text-sm text-slate-500">
                  Scan to view {brandingDraft.name || 'your menu'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="QR Downloads"
            subtitle="Export options for your single menu QR."
            icon={<Download className="h-5 w-5" />}
          >
            {qrExportOptions.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {qrExportOptions.map((option) => (
                  <div
                    key={`${option.label}-${option.size}`}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {option.label} ({option.size}px)
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void downloadQr('png', option.size, option.label)}
                      >
                        PNG
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void downloadQr('svg', option.size, option.label)}
                      >
                        SVG
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                QR download sizes are unavailable.
              </div>
            )}
          </SectionCard>

        </div>
      )}
    </div>
  )
}
