'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

import type { BusinessSummary } from '../api/restaurant-client'

export type RestaurantFormValues = {
  name: string
  ownerId?: string
}

type RestaurantFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  restaurant?: BusinessSummary | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RestaurantFormValues) => void
  isSubmitting: boolean
}

export function RestaurantFormDialog({
  open,
  mode,
  restaurant,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: RestaurantFormDialogProps) {
  const [name, setName] = useState('')
  const [ownerId, setOwnerId] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setOwnerId('')
      return
    }

    setName(restaurant?.name ?? '')
    setOwnerId('')
  }, [open, restaurant])

  const title = mode === 'create' ? 'Create Business' : 'Edit Business'
  const description =
    mode === 'create'
      ? 'Add a new business record for an owner account.'
      : 'Update the business name.'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const parsedOwnerId = ownerId.trim() ? ownerId.trim() : undefined
    onSubmit({
      name: trimmedName,
      ownerId: mode === 'create' ? parsedOwnerId : undefined,
    })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="restaurant-name">
            Business name
          </label>
          <Input
            id="restaurant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bean Haven Cafe"
            autoComplete="off"
          />
        </div>

        {mode === 'create' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="restaurant-owner-id">
              Owner user ID
            </label>
            <Input
              id="restaurant-owner-id"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              placeholder="UUID"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The owner must already exist and have the OWNER role.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Business' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
