'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, QrCode, Save } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { getBusinessQr, updateBusinessQr, type BusinessQrConfig } from '../api/business-client'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'

const DEFAULT_QR: BusinessQrConfig = {
  isPublished: true,
  slug: 'menu',
  basePath: '/menu',
  includeTableParam: true,
  tableParamKey: 'ref',
  defaultTableCount: 4,
  qrForeground: '#0F172A',
  qrBackground: '#FFFFFF',
  includeLogo: true,
}

export default function QrPage() {
  const { data: session } = useSession()
  const businessId = session?.user?.businessId ?? null
  const [draft, setDraft] = useState<BusinessQrConfig>(DEFAULT_QR)

  const qrQuery = useQuery({
    queryKey: ['business-owner', 'qr', businessId],
    queryFn: () => getBusinessQr(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (qrQuery.data) {
      setDraft({
        ...DEFAULT_QR,
        ...qrQuery.data,
      })
    }
  }, [qrQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: BusinessQrConfig) => updateBusinessQr(businessId ?? '', payload),
    onSuccess: (data) => {
      setDraft(data)
      toast.success('QR settings saved')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save QR settings')
    },
  })

  const appOrigin = typeof window === 'undefined' ? '' : window.location.origin

  const publicBaseUrl = useMemo(() => {
    if (!businessId) return ''
    return `${appOrigin}${draft.basePath}/${encodeURIComponent(businessId)}?slug=${encodeURIComponent(draft.slug)}`
  }, [appOrigin, draft.basePath, draft.slug, businessId])

  const previewVariantUrls = useMemo(() => {
    if (!publicBaseUrl) return []
    const variantCount = Math.max(1, Math.min(Number(draft.defaultTableCount) || 1, 8))
    return Array.from({ length: variantCount }, (_, index) => {
      const variant = index + 1
      if (!draft.includeTableParam) {
        return { variant, url: publicBaseUrl }
      }

      return {
        variant,
        url: `${publicBaseUrl}&${encodeURIComponent(draft.tableParamKey)}=${variant}`,
      }
    })
  }, [draft.defaultTableCount, draft.includeTableParam, draft.tableParamKey, publicBaseUrl])

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Unable to copy')
    }
  }

  if (!businessId) {
    return (
      <SectionCard title="QR" subtitle="Business not found for current session.">
        <p className="text-sm text-slate-500">Sign in with an owner or staff account linked to a business.</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="QR"
        description="Configure public QR slug, publish state, and URL query parameter behavior."
        actions={
          <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending || qrQuery.isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save QR settings
          </Button>
        }
      />

      <SectionCard title="QR Configuration" subtitle="Public URL and rendering settings." icon={<QrCode className="h-5 w-5" />}>
        {qrQuery.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Unable to load saved QR settings. Showing local defaults until data is available.
          </div>
        ) : null}

        {qrQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading QR settings...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="inline-flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
              Publish QR link
              <Switch
                checked={draft.isPublished}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, isPublished: event.currentTarget.checked }))
                }
              />
            </label>
            <label className="inline-flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
              Include logo in QR
              <Switch
                checked={draft.includeLogo}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, includeLogo: event.currentTarget.checked }))
                }
              />
            </label>
            <Input
              value={draft.slug}
              placeholder="public-slug"
              onChange={(event) => setDraft((previous) => ({ ...previous, slug: event.target.value }))}
            />
            <Input
              value={draft.basePath}
              placeholder="/menu"
              onChange={(event) => setDraft((previous) => ({ ...previous, basePath: event.target.value }))}
            />
            <label className="inline-flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
              Include query parameter
              <Switch
                checked={draft.includeTableParam}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, includeTableParam: event.currentTarget.checked }))
                }
              />
            </label>
            <Input
              value={draft.tableParamKey}
              placeholder="ref"
              onChange={(event) => setDraft((previous) => ({ ...previous, tableParamKey: event.target.value }))}
              disabled={!draft.includeTableParam}
            />
            <Input
              type="number"
              min="1"
              max="20"
              value={draft.defaultTableCount}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, defaultTableCount: Number(event.target.value) || 1 }))
              }
            />
            <Input
              value={draft.qrForeground}
              placeholder="#0F172A"
              onChange={(event) => setDraft((previous) => ({ ...previous, qrForeground: event.target.value }))}
            />
            <Input
              value={draft.qrBackground}
              placeholder="#FFFFFF"
              onChange={(event) => setDraft((previous) => ({ ...previous, qrBackground: event.target.value }))}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Generated Links" subtitle="Base link plus optional query-parameter variants.">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Base menu URL</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="max-w-full overflow-x-auto text-sm text-slate-700">{publicBaseUrl || 'N/A'}</code>
              {publicBaseUrl ? (
                <Button variant="outline" size="sm" onClick={() => copy(publicBaseUrl)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            {previewVariantUrls.map((entry) => (
              <div key={entry.variant} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="space-y-1">
                  <Badge variant="outline">Variant {entry.variant}</Badge>
                  <p className="max-w-3xl overflow-x-auto text-xs text-slate-600">{entry.url}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copy(entry.url)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
