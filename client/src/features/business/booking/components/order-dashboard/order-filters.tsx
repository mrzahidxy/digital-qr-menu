import type { ChangeEvent } from 'react'
import { CalendarDays, ChevronDown, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { OrderStatus } from '@/types/order'

type OrderFiltersProps = {
  tableLabel: string
  guestName: string
  status: OrderStatus | 'all'
  createdFrom: string
  sortValue: string
  onTableLabelChange: (value: string) => void
  onGuestNameChange: (value: string) => void
  onStatusChange: (value: OrderStatus | 'all') => void
  onCreatedFromChange: (value: string) => void
  onSortChange: (value: string) => void
  onReset: () => void
}

export function OrderFilters({
  tableLabel,
  guestName,
  status,
  createdFrom,
  sortValue,
  onTableLabelChange,
  onGuestNameChange,
  onStatusChange,
  onCreatedFromChange,
  onSortChange,
  onReset,
}: OrderFiltersProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={tableLabel}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onTableLabelChange(event.target.value)}
          placeholder="Table label"
          className="h-12 w-full rounded-xl border-input bg-surface px-4 text-base shadow-sm sm:w-40"
        />
        <Input
          value={guestName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onGuestNameChange(event.target.value)}
          placeholder="Guest name..."
          className="h-12 w-full rounded-xl border-input bg-surface px-4 text-base shadow-sm sm:w-56"
        />
        <div className="relative w-full sm:w-44">
          <Select
            value={status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onStatusChange(event.target.value as OrderStatus | 'all')
            }
            className="h-12 rounded-xl border-input bg-surface pl-4 pr-10 text-base shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
        </div>
        <div className="relative w-full sm:w-48">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={createdFrom}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onCreatedFromChange(event.target.value)}
            className="h-12 rounded-xl border-input bg-surface pl-10 pr-3 text-base shadow-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <div className="relative">
            <Select
              value={sortValue}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => onSortChange(event.target.value)}
              className="h-12 rounded-xl border-input bg-surface pl-4 pr-10 text-base shadow-sm"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="status:asc">Status A-Z</option>
              <option value="tableLabel:asc">Table A-Z</option>
            </Select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-4"
            onClick={onReset}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </section>
  )
}
