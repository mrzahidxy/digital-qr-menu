'use client'

import { apiClient } from '@/lib/api'

type MenuBadge = {
  label: string
  variant?: 'default' | 'outline' | 'success' | 'warning'
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  isAvailable?: boolean
  imageUrl?: string | null
  badges?: MenuBadge[]
  calories?: number
}

export type MenuSection = {
  id: string
  title: string
  subtitle?: string
  items: MenuItem[]
}

type PublicMenuPayload = {
  businessName: string
  description: string | null
  branding: {
    logoUrl: string | null
    coverImageUrl: string | null
    primaryColor: string | null
    accentColor: string | null
    fontFamily: string | null
  }
  qrSlug: string
  menu: {
    categories: Array<{
      id: string
      title: string
      subtitle: string | null
      items: Array<{
        id: string
        name: string
        description: string
        price: number
        isAvailable: boolean
        imageUrl: string | null
      }>
    }>
  }
}

export type PublicMenuResponse = {
  businessId: string
  businessName: string
  displayName: string
  description: string
  branding: {
    logoUrl: string | null
    coverImageUrl: string | null
    primaryColor: string
    accentColor: string
    textColor: string
    fontFamily: string
  }
  qrSlug: string
  sections: MenuSection[]
}

export type CreatePublicOrderInput = {
  businessId: string
  guestName: string
  tableLabel: string
  orderNote: string
  items: Array<{
    itemId: string
    quantity: number
  }>
}

export type PublicOrderResponse = {
  orderRef: string
  status: 'received'
  submittedAt: string
}

const mergeItemMetadata = (
  item: PublicMenuPayload['menu']['categories'][number]['items'][number],
): MenuItem => {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl ?? null,
    calories: undefined,
    badges: [],
  }
}

export async function getPublicMenu(params: {
  businessId?: string
}): Promise<PublicMenuResponse> {
  const payload = await apiClient.get<PublicMenuPayload>('/api/v1/orders/public/menu', {
    query: { businessId: params.businessId },
    cache: 'no-store',
  })

  return {
    businessId: params.businessId ?? '',
    businessName: payload.businessName,
    displayName: payload.businessName,
    description: payload.description ?? '',
    branding: {
      logoUrl: payload.branding?.logoUrl ?? null,
      coverImageUrl: payload.branding?.coverImageUrl ?? null,
      primaryColor: payload.branding?.primaryColor ?? '#0E7C86',
      accentColor: payload.branding?.accentColor ?? '#1B9C85',
      textColor: '#0F172A',
      fontFamily: payload.branding?.fontFamily ?? 'Trebuchet MS, Segoe UI, sans-serif',
    },
    qrSlug: payload.qrSlug,
    sections: payload.menu.categories.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle ?? undefined,
      items: category.items.map(mergeItemMetadata),
    })),
  }
}

export async function createPublicOrder(input: CreatePublicOrderInput) {
  return apiClient.post<PublicOrderResponse>(
    '/api/v1/orders/public',
    {
      businessId: input.businessId,
      guestName: input.guestName,
      tableLabel: input.tableLabel,
      orderNote: input.orderNote,
      items: input.items,
    },
    {
      cache: 'no-store',
    },
  )
}
