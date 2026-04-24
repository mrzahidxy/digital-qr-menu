'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Save, Settings, ShieldCheck } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime } from '@/lib/format'

import {
  getBusinessById,
  updateBusinessSettings,
  type BusinessSummary,
} from '../api/business-client'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'

const settingsKey = (businessId: string | null) => [
  'business-owner',
  'settings',
  businessId,
]

function StatusBadge({ status }: { status?: BusinessSummary['status'] }) {
  if (status === 'SUSPENDED') {
    return <Badge variant="warning">Suspended</Badge>
  }

  return <Badge variant="success">Active</Badge>
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const queryClient = useQueryClient()
  const businessId = session?.user?.businessId ?? null
  const [name, setName] = useState('')

  const settingsQuery = useQuery({
    queryKey: settingsKey(businessId),
    queryFn: () => getBusinessById(businessId ?? ''),
    enabled: sessionStatus === 'authenticated' && Boolean(businessId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (settingsQuery.data) {
      setName(settingsQuery.data.name)
    }
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('Business name is required')
      }

      return updateBusinessSettings(businessId ?? '', { name: trimmedName })
    },
    onSuccess: (business) => {
      setName(business.name)
      queryClient.setQueryData(settingsKey(businessId), business)
      void queryClient.invalidateQueries({ queryKey: ['business-owner', 'workspace', businessId] })
      void queryClient.invalidateQueries({ queryKey: ['business-owner', 'branding', businessId] })
      toast.success('Business settings saved')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    },
  })

  const business = settingsQuery.data
  const isLoading = sessionStatus === 'loading' || settingsQuery.isLoading
  const hasChanges = Boolean(business && name.trim() !== business.name)

  const updatedText = useMemo(() => {
    if (!business?.updatedAt) return 'Not available'
    return formatRelativeTime(String(business.updatedAt))
  }, [business?.updatedAt])

  const copyBusinessId = async () => {
    if (!businessId) {
      toast.error('Business ID unavailable')
      return
    }

    try {
      await navigator.clipboard.writeText(businessId)
      toast.success('Business ID copied')
    } catch {
      toast.error('Unable to copy business ID')
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    saveMutation.mutate()
  }

  if (sessionStatus !== 'loading' && !businessId) {
    return (
      <SectionCard title="Settings" subtitle="Business not found for current session.">
        <p className="text-sm text-slate-500">
          Sign in with an owner or staff account linked to a business.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Settings"
        description="Business settings backed by the current business API."
        actions={
          <Button
            type="submit"
            form="business-settings-form"
            disabled={isLoading || saveMutation.isPending || !hasChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <SectionCard
        title="Business Profile"
        subtitle="Editable fields are limited to the business update endpoint."
        icon={<Settings className="h-5 w-5" />}
      >
        {settingsQuery.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : 'Unable to load business settings'}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading business settings...</p>
        ) : (
          <form id="business-settings-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Business name</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Business name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Public slug</span>
                <Input value={business?.slug ?? ''} readOnly />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workspace status
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700">
                    {business?.status === 'SUSPENDED'
                      ? 'Workspace access is suspended.'
                      : 'Workspace is active.'}
                  </p>
                  <StatusBadge status={business?.status} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Public ordering
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700">
                    {business?.isPublicOrderingEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <Badge variant={business?.isPublicOrderingEnabled ? 'success' : 'warning'}>
                    {business?.isPublicOrderingEnabled ? 'On' : 'Off'}
                  </Badge>
                </div>
              </div>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Workspace Snapshot"
        subtitle="Read-only operational identifiers from the live business record."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-800">
                {business?.name ?? 'Business'}
              </p>
              <p className="text-xs text-teal-700">Updated {updatedText}</p>
            </div>
            <StatusBadge status={business?.status} />
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Business ID
              </p>
              <p className="text-sm font-mono tracking-wide text-slate-700">
                {businessId ?? 'Unavailable'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void copyBusinessId()}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
