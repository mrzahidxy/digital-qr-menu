import { create } from 'zustand'

import type { OrderStatus } from '@/types/order'

type OrderFilterState = {
  status: OrderStatus | 'all'
  page: number
  pageSize: number
  tableLabel: string
  guestName: string
  createdFrom: string
  createdTo: string
  setStatus: (value: OrderStatus | 'all') => void
  setPage: (value: number) => void
  setPageSize: (value: number) => void
  setTableLabel: (value: string) => void
  setGuestName: (value: string) => void
  setCreatedFrom: (value: string) => void
  setCreatedTo: (value: string) => void
  reset: () => void
}

const defaultState: Omit<
  OrderFilterState,
  | 'setStatus'
  | 'setPage'
  | 'setPageSize'
  | 'setTableLabel'
  | 'setGuestName'
  | 'setCreatedFrom'
  | 'setCreatedTo'
  | 'reset'
> = {
  status: 'all',
  page: 1,
  pageSize: 10,
  tableLabel: '',
  guestName: '',
  createdFrom: '',
  createdTo: '',
}

export const useOrderFilters = create<OrderFilterState>((set) => ({
  ...defaultState,
  setStatus: (value) =>
    set({
      status: value,
      page: 1,
    }),
  setPage: (value) => set({ page: value }),
  setPageSize: (value) =>
    set({
      pageSize: value,
      page: 1,
    }),
  setTableLabel: (value) =>
    set({
      tableLabel: value,
      page: 1,
    }),
  setGuestName: (value) =>
    set({
      guestName: value,
      page: 1,
    }),
  setCreatedFrom: (value) =>
    set({
      createdFrom: value,
      page: 1,
    }),
  setCreatedTo: (value) =>
    set({
      createdTo: value,
      page: 1,
    }),
  reset: () => set(defaultState),
}))
