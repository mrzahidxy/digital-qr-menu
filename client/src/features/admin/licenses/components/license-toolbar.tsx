'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'

import type { LicenseStatus, LicenseType } from '../api/license-client'

export type LicenseToolbarFilters = {
  searchQuery: string
  typeFilter: 'all' | LicenseType
  statusFilter: 'all' | LicenseStatus
  issuedFrom: string
  issuedTo: string
  expiresFrom: string
  expiresTo: string
}

type LicenseToolbarProps = LicenseToolbarFilters & {
  onSearchChange: (value: string) => void
  onTypeChange: (value: 'all' | LicenseType) => void
  onStatusChange: (value: 'all' | LicenseStatus) => void
  onIssuedFromChange: (value: string) => void
  onIssuedToChange: (value: string) => void
  onExpiresFromChange: (value: string) => void
  onExpiresToChange: (value: string) => void
}

const typeOptions: Array<{ value: 'all' | LicenseType; label: string }> = [
  { value: 'all', label: 'All plans' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'LIFETIME', label: 'Lifetime' },
]

const statusOptions: Array<{ value: 'all' | LicenseStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function LicenseToolbar({
  searchQuery,
  typeFilter,
  statusFilter,
  issuedFrom,
  issuedTo,
  expiresFrom,
  expiresTo,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onIssuedFromChange,
  onIssuedToChange,
  onExpiresFromChange,
  onExpiresToChange,
}: LicenseToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search key or business..."
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(value: 'all' | LicenseType) => onTypeChange(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value: 'all' | LicenseStatus) => onStatusChange(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          type="date"
          value={issuedFrom}
          onChange={(event) => onIssuedFromChange(event.target.value)}
          aria-label="Issued from"
        />
        <Input
          type="date"
          value={issuedTo}
          onChange={(event) => onIssuedToChange(event.target.value)}
          aria-label="Issued to"
        />
        <Input
          type="date"
          value={expiresFrom}
          onChange={(event) => onExpiresFromChange(event.target.value)}
          aria-label="Expires from"
        />
        <Input
          type="date"
          value={expiresTo}
          onChange={(event) => onExpiresToChange(event.target.value)}
          aria-label="Expires to"
        />
      </div>
    </div>
  )
}
