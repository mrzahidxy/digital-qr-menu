'use client'

import { Search, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'

import type { LogLevel } from '../api/log-client'

type LogToolbarProps = {
  searchQuery: string
  levelFilter: 'all' | LogLevel
  categoryFilter: 'all' | string
  userIdFilter: string
  dateFrom: string
  dateTo: string
  retentionDays: number
  levelOptions: LogLevel[]
  categoryOptions: string[]
  onSearchChange: (value: string) => void
  onLevelChange: (value: 'all' | LogLevel) => void
  onCategoryChange: (value: 'all' | string) => void
  onUserIdChange: (value: string) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onRetentionDaysChange: (value: number) => void
  onClearLogs: () => void
}

export function LogToolbar({
  searchQuery,
  levelFilter,
  categoryFilter,
  userIdFilter,
  dateFrom,
  dateTo,
  retentionDays,
  levelOptions,
  categoryOptions,
  onSearchChange,
  onLevelChange,
  onCategoryChange,
  onUserIdChange,
  onDateFromChange,
  onDateToChange,
  onRetentionDaysChange,
  onClearLogs,
}: LogToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(2,minmax(0,1fr))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search messages, categories, or context..."
            className="pl-9"
          />
        </div>

        <Select value={levelFilter} onValueChange={(value: 'all' | LogLevel) => onLevelChange(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {levelOptions.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(value: 'all' | string) => onCategoryChange(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          aria-label="Date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          aria-label="Date to"
        />
        <Input
          type="number"
          min={1}
          max={3650}
          value={retentionDays}
          onChange={(event) => onRetentionDaysChange(Number(event.target.value))}
          aria-label="Retention days"
          placeholder="Retention days"
        />
        <Input
          placeholder="Actor ID"
          value={userIdFilter}
          onChange={(event) => onUserIdChange(event.target.value)}
          aria-label="Actor ID"
        />
        <Button variant="outline" className="justify-center gap-2" onClick={onClearLogs}>
          <Trash2 className="h-4 w-4" />
          Clear Old Logs
        </Button>
      </div>
    </div>
  )
}
