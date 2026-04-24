'use client'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { RoleFilterOption } from './types'
import { ROLE_FILTER_OPTIONS } from './constants'

type UsersTableHeaderProps = {
  searchQuery: string
  roleFilter: RoleFilterOption
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: RoleFilterOption) => void
}

export function UsersTableHeader({
  searchQuery,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
}: UsersTableHeaderProps) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, email, or role..."
          className="pl-10"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={roleFilter === option.value ? 'default' : 'outline'}
            onClick={() => onRoleFilterChange(option.value)}
            className="h-8 px-3"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
