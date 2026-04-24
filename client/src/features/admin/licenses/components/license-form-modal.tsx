'use client'

import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'

import type { LicenseKeyDetail, LicenseKey } from '../api/license-client'

const licenseTypeValues = ['MONTHLY', 'YEARLY', 'LIFETIME'] as const
const licenseStatusValues = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const

const licenseSchema = z
  .object({
    key: z.string().trim().optional(),
    type: z.enum(licenseTypeValues),
    status: z.enum(licenseStatusValues),
    issuedAt: z.string().trim().optional(),
    expiresAt: z.string().trim().min(1, 'Expiration date is required'),
    businessId: z.string().trim().optional(),
  })
  .refine((value) => value.businessId?.length, {
    message: 'Business ID is required',
    path: ['businessId'],
  })

export type LicenseFormValues = z.infer<typeof licenseSchema>

type LicenseFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  license?: LicenseKey | LicenseKeyDetail | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LicenseFormValues) => Promise<void>
  isSubmitting: boolean
}

export function LicenseFormModal({
  open,
  mode,
  license,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: LicenseFormModalProps) {
  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      key: '',
      type: 'MONTHLY',
      status: 'ACTIVE',
      issuedAt: '',
      expiresAt: '',
      businessId: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        key: '',
        type: 'MONTHLY',
        status: 'ACTIVE',
        issuedAt: '',
        expiresAt: '',
        businessId: '',
      })
      return
    }

    if (license) {
      form.reset({
        key: license.key,
        type: license.type,
        status: license.status,
        issuedAt: license.issuedAt.slice(0, 10),
        expiresAt: (license.expiresAt ?? '').slice(0, 10),
        businessId: license.business?.id ?? '',
      })
    }
  }, [form, license, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Create License' : 'Edit License'}
      description="Manage license access and expiration."
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="License key" error={form.formState.errors.key?.message}>
            <Input placeholder="LIC-XXXXXX" {...form.register('key')} />
          </FormField>
          <FormField label="Plan" error={form.formState.errors.type?.message}>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseTypeValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseStatusValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Issued at" error={form.formState.errors.issuedAt?.message}>
            <Input type="date" {...form.register('issuedAt')} />
          </FormField>
          <FormField label="Expires at" error={form.formState.errors.expiresAt?.message}>
            <Input type="date" {...form.register('expiresAt')} />
          </FormField>
          <FormField label="Business ID" error={form.formState.errors.businessId?.message}>
            <Input placeholder="UUID" {...form.register('businessId')} />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : mode === 'create' ? (
              'Create License'
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

type FormFieldProps = {
  label: string
  children: ReactNode
  error?: string
}

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}
