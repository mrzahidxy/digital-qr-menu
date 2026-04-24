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

export type RestaurantActivityFilter = 'all' | 'active' | 'quiet'

type RestaurantToolbarProps = {
  searchQuery: string
  activityFilter: RestaurantActivityFilter
  onSearchChange: (value: string) => void
  onActivityChange: (value: RestaurantActivityFilter) => void
}

export function RestaurantToolbar({
  searchQuery,
  activityFilter,
  onSearchChange,
  onActivityChange,
}: RestaurantToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by business, owner, or email..."
          className="pl-9"
        />
      </div>

      <Select value={activityFilter} onValueChange={(value: RestaurantActivityFilter) => onActivityChange(value)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by activity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Businesses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="quiet">Quiet</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
