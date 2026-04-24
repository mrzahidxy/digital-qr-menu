'use client'

import { apiClient } from '@/lib/api'

export type BusinessSummary = {
  id: string
  name: string
  ownerId: string
  slug: string
  description: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  primaryColor: string
  accentColor: string
  fontFamily: string
  status: 'ACTIVE' | 'SUSPENDED'
  isPublicOrderingEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type BusinessStaffMember = {
  role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
  createdAt: string
  user: {
    id: string
    email: string
    fullName: string | null
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'USER' | 'GUEST'
  }
}

export type BusinessMenuItem = {
  id: string
  categoryId: string
  name: string
  description?: string | null
  price: number
  isAvailable: boolean
  badge: 'VEGAN' | 'SPICY' | 'NONE'
  photoUrl?: string | null
}

export type BusinessMenuCategory = {
  id: string
  menuId: string
  name: string
  description?: string | null
  items: BusinessMenuItem[]
}

export type BusinessMenuConfig = {
  businessId: string
  menuId: string
  categories: BusinessMenuCategory[]
  updatedAt?: string
}

export type BusinessBrandingConfig = {
  name: string
  description?: string | null
  logoUrl?: string | null
  coverImageUrl?: string | null
  primaryColor: string
  accentColor: string
  typographyPreset?: 'modern-sans' | 'classic-serif' | 'friendly-round' | 'bold-impact'
  updatedAt?: string
}

export type QrSettings = {
  isPublished: boolean
  slug: string
  basePath: string
  includeTableParam: boolean
  tableParamKey: string
  defaultTableCount: number
  qrForeground: string
  qrBackground: string
  includeLogo: boolean
  updatedAt?: string
  // Backward-compat aliases while screens migrate to the new QR contract names.
  isEnabled?: boolean
  foregroundColor?: string
  backgroundColor?: string
}

export type BusinessQrConfig = QrSettings
export type Business = BusinessWorkspaceResponse['business']

export type BusinessWorkspaceResponse = {
  business: {
    id: string
    ownerId: string
    name: string
    slug: string
    description: string | null
    logoUrl: string | null
    coverImageUrl: string | null
    primaryColor: string
    accentColor: string
    fontFamily: string
    status: 'ACTIVE' | 'SUSPENDED'
    isPublicOrderingEnabled: boolean
    createdAt: string
    updatedAt: string
  }
  metrics: {
    totalOrders: number
    ordersLast30d: number
    activeOrders: number
    pendingOrders: number
    completedOrders: number
    cancelledOrders: number
    staffCount: number
    activeLicenseCount: number
  }
  recentOrders: Array<{
    id: string
    tableLabel: string | null
    guestName: string | null
    status: 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
    createdAt: string
  }>
  recentStaff: BusinessStaffMember[]
}

export type BusinessMenuWorkspaceSummary = {
  hasMenus: boolean
  hasPublishedMenu: boolean
  activeMenuItems: number
}

type ApiResponse<T> = {
  message?: string
} & T

type BusinessMenuRecord = {
  id: string
  name: string
  slug: string
  description?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

type BusinessCategoryRecord = {
  id: string
  menuId: string
  name: string
  description?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

type BusinessItemRecord = {
  id: string
  categoryId: string
  name: string
  description?: string | null
  priceCents: number
  badge: 'VEGAN' | 'SPICY' | 'NONE'
  photoUrl?: string | null
  isAvailable: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

type RawBusinessBranding = {
  name?: string | null
  description?: string | null
  logoUrl?: string | null
  coverImageUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  typographyPreset?: BusinessBrandingConfig['typographyPreset']
  fontFamily?: string | null
  updatedAt?: string
}

type RawBusinessQr = {
  publicSlug?: string | null
  includeLogo?: boolean
  foregroundColor?: string | null
  backgroundColor?: string | null
  updatedAt?: string
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value: string) => UUID_REGEX.test(value)

const toTypographyPreset = (
  fontFamily?: string | null,
): BusinessBrandingConfig['typographyPreset'] => {
  if (!fontFamily) return 'modern-sans'
  const normalized = fontFamily.toLowerCase()
  if (normalized.includes('georgia') || normalized.includes('serif'))
    return 'classic-serif'
  if (normalized.includes('rounded')) return 'friendly-round'
  if (normalized.includes('impact')) return 'bold-impact'
  return 'modern-sans'
}

const fromTypographyPreset = (preset: BusinessBrandingConfig['typographyPreset']) => {
  switch (preset) {
    case 'classic-serif':
      return 'Georgia, Times New Roman, serif'
    case 'friendly-round':
      return 'Arial Rounded MT Bold, Trebuchet MS, sans-serif'
    case 'bold-impact':
      return 'Impact, Arial Black, sans-serif'
    default:
      return 'Trebuchet MS, Segoe UI, sans-serif'
  }
}

async function ensureMenuForBusiness(businessId: string): Promise<BusinessMenuRecord> {
  const menus = await apiClient.get<BusinessMenuRecord[]>(
    `/api/v1/businesses/${businessId}/menus`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  const preferred = menus.find((menu) => menu.isDefault) ?? menus[0]
  if (preferred) {
    if (preferred.status === 'PUBLISHED' && preferred.isDefault) {
      return preferred
    }

    const updated = await apiClient.patch<ApiResponse<{ menu: BusinessMenuRecord }>>(
      `/api/v1/businesses/${businessId}/menus/${preferred.id}`,
      {
        status: 'PUBLISHED',
        isDefault: true,
      },
      { auth: true },
    )
    return updated.menu
  }

  const response = await apiClient.post<ApiResponse<{ menu: BusinessMenuRecord }>>(
    `/api/v1/businesses/${businessId}/menus`,
    {
      name: 'Main Menu',
      slug: 'main-menu',
      status: 'PUBLISHED',
      isDefault: true,
    },
    { auth: true },
  )

  return response.menu
}

async function fetchMenuConfig(
  businessId: string,
  menu: { id: string; updatedAt?: string },
): Promise<BusinessMenuConfig> {
  const categories = await apiClient.get<BusinessCategoryRecord[]>(
    `/api/v1/businesses/${businessId}/menus/${menu.id}/categories`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  const categoriesWithItems = await Promise.all(
    categories.map(async (category) => {
      const items = await apiClient.get<BusinessItemRecord[]>(
        `/api/v1/businesses/${businessId}/menus/${menu.id}/categories/${category.id}/items`,
        {
          auth: true,
          cache: 'no-store',
        },
      )

      return {
        id: category.id,
        menuId: category.menuId,
        name: category.name,
        description: category.description ?? '',
        items: items.map((item) => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description ?? '',
          price: item.priceCents / 100,
          isAvailable: item.isAvailable,
          badge: item.badge,
          photoUrl: item.photoUrl ?? '',
        })),
      } satisfies BusinessMenuCategory
    }),
  )

  return {
    businessId,
    menuId: menu.id,
    categories: categoriesWithItems,
    updatedAt: menu.updatedAt,
  }
}

export async function getBusinessById(businessId: string): Promise<BusinessSummary> {
  return apiClient.get<BusinessSummary>(`/api/v1/businesses/${businessId}`, {
    auth: true,
    cache: 'no-store',
  })
}

export async function updateBusinessSettings(
  businessId: string,
  input: { name: string },
): Promise<BusinessSummary> {
  const response = await apiClient.patch<ApiResponse<{ business: BusinessSummary }>>(
    `/api/v1/businesses/${businessId}`,
    input,
    { auth: true },
  )

  return response.business
}

export async function listBusinessStaff(
  businessId: string,
): Promise<BusinessStaffMember[]> {
  return apiClient.get<BusinessStaffMember[]>(`/api/v1/businesses/${businessId}/staff`, {
    auth: true,
    cache: 'no-store',
  })
}

export async function getBusinessWorkspace(
  businessId: string,
  query: { recentOrdersLimit?: number; recentStaffLimit?: number } = {},
): Promise<BusinessWorkspaceResponse> {
  return apiClient.get<BusinessWorkspaceResponse>(
    `/api/v1/businesses/${businessId}/workspace`,
    {
      auth: true,
      cache: 'no-store',
      query,
    },
  )
}

export async function getBusinessMenuWorkspaceSummary(
  businessId: string,
): Promise<BusinessMenuWorkspaceSummary> {
  const menus = await apiClient.get<
    Array<BusinessMenuRecord & { _count?: { categories?: number } }>
  >(`/api/v1/businesses/${businessId}/menus`, {
    auth: true,
    cache: 'no-store',
  })

  if (!menus.length) {
    return {
      hasMenus: false,
      hasPublishedMenu: false,
      activeMenuItems: 0,
    }
  }

  const hasPublishedMenu = menus.some((menu) => menu.status === 'PUBLISHED')
  const primaryMenu =
    menus.find((menu) => menu.isDefault) ??
    menus.find((menu) => menu.status === 'PUBLISHED') ??
    menus[0]

  const categories = await apiClient.get<BusinessCategoryRecord[]>(
    `/api/v1/businesses/${businessId}/menus/${primaryMenu.id}/categories`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  let activeMenuItems = 0
  for (const category of categories) {
    const items = await apiClient.get<BusinessItemRecord[]>(
      `/api/v1/businesses/${businessId}/menus/${primaryMenu.id}/categories/${category.id}/items`,
      {
        auth: true,
        cache: 'no-store',
      },
    )
    activeMenuItems += items.filter((item) => item.isAvailable).length
  }

  return {
    hasMenus: true,
    hasPublishedMenu,
    activeMenuItems,
  }
}

export async function getBusinessMenu(businessId: string): Promise<BusinessMenuConfig> {
  const menu = await ensureMenuForBusiness(businessId)
  return fetchMenuConfig(businessId, menu)
}

async function listMenuCategories(businessId: string, menuId: string) {
  return apiClient.get<BusinessCategoryRecord[]>(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories`,
    {
      auth: true,
      cache: 'no-store',
    },
  )
}

async function createMenuCategory(
  businessId: string,
  menuId: string,
  payload: { name: string; description?: string; sortOrder: number },
) {
  return apiClient.post<ApiResponse<{ category: BusinessCategoryRecord }>>(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories`,
    payload,
    { auth: true },
  )
}

async function updateMenuCategory(
  businessId: string,
  menuId: string,
  categoryId: string,
  payload: { name?: string; description?: string; sortOrder?: number },
) {
  return apiClient.patch(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}`,
    payload,
    { auth: true },
  )
}

async function deleteMenuCategory(
  businessId: string,
  menuId: string,
  categoryId: string,
) {
  return apiClient.delete(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}`,
    {
      auth: true,
    },
  )
}

async function listCategoryItems(businessId: string, menuId: string, categoryId: string) {
  return apiClient.get<BusinessItemRecord[]>(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}/items`,
    {
      auth: true,
      cache: 'no-store',
    },
  )
}

async function createCategoryItem(
  businessId: string,
  menuId: string,
  categoryId: string,
  payload: {
    name: string
    description?: string
    priceCents: number
    badge: 'VEGAN' | 'SPICY' | 'NONE'
    photoUrl?: string
    isAvailable: boolean
    sortOrder: number
  },
) {
  return apiClient.post<ApiResponse<{ item: BusinessItemRecord }>>(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}/items`,
    payload,
    { auth: true },
  )
}

async function updateCategoryItem(
  businessId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  payload: {
    name?: string
    description?: string
    priceCents?: number
    badge?: 'VEGAN' | 'SPICY' | 'NONE'
    photoUrl?: string
    isAvailable?: boolean
    sortOrder?: number
  },
) {
  return apiClient.patch(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}/items/${itemId}`,
    payload,
    { auth: true },
  )
}

async function deleteCategoryItem(
  businessId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
) {
  return apiClient.delete(
    `/api/v1/businesses/${businessId}/menus/${menuId}/categories/${categoryId}/items/${itemId}`,
    { auth: true },
  )
}

export async function updateBusinessMenu(
  businessId: string,
  input: BusinessMenuConfig,
): Promise<BusinessMenuConfig> {
  const menu =
    input.menuId && isUuid(input.menuId)
      ? { id: input.menuId }
      : await ensureMenuForBusiness(businessId)
  const menuId = menu.id
  const existingCategories = await listMenuCategories(businessId, menuId)

  const nextCategoryIds = new Set<string>()
  const existingCategoryMap = new Map(
    existingCategories.map((category) => [category.id, category] as const),
  )

  for (
    let categoryIndex = 0;
    categoryIndex < input.categories.length;
    categoryIndex += 1
  ) {
    const category = input.categories[categoryIndex]
    const sortOrder = categoryIndex

    let categoryId = category.id
    if (isUuid(category.id) && existingCategoryMap.has(category.id)) {
      await updateMenuCategory(businessId, menuId, category.id, {
        name: category.name,
        description: category.description ?? '',
        sortOrder,
      })
    } else {
      const created = await createMenuCategory(businessId, menuId, {
        name: category.name,
        description: category.description ?? '',
        sortOrder,
      })
      categoryId = created.category.id
    }

    nextCategoryIds.add(categoryId)

    const existingItems = await listCategoryItems(businessId, menuId, categoryId)
    const existingItemMap = new Map(existingItems.map((item) => [item.id, item] as const))
    const nextItemIds = new Set<string>()

    for (let itemIndex = 0; itemIndex < category.items.length; itemIndex += 1) {
      const item = category.items[itemIndex]
      const itemPayload = {
        name: item.name,
        description: item.description ?? '',
        priceCents: Math.round((Number(item.price) || 0) * 100),
        badge: item.badge ?? 'NONE',
        photoUrl: item.photoUrl ?? '',
        isAvailable: item.isAvailable ?? true,
        sortOrder: itemIndex,
      }

      if (isUuid(item.id) && existingItemMap.has(item.id)) {
        await updateCategoryItem(businessId, menuId, categoryId, item.id, itemPayload)
        nextItemIds.add(item.id)
      } else {
        const created = await createCategoryItem(
          businessId,
          menuId,
          categoryId,
          itemPayload,
        )
        nextItemIds.add(created.item.id)
      }
    }

    for (const serverItem of existingItems) {
      if (!nextItemIds.has(serverItem.id)) {
        await deleteCategoryItem(businessId, menuId, categoryId, serverItem.id)
      }
    }
  }

  for (const serverCategory of existingCategories) {
    if (!nextCategoryIds.has(serverCategory.id)) {
      await deleteMenuCategory(businessId, menuId, serverCategory.id)
    }
  }

  return fetchMenuConfig(businessId, {
    id: menuId,
    updatedAt: input.updatedAt,
  })
}

export async function getBusinessBranding(
  businessId: string,
): Promise<BusinessBrandingConfig> {
  const [business, branding] = await Promise.all([
    apiClient.get<{ name: string }>(`/api/v1/businesses/${businessId}`, {
      auth: true,
      cache: 'no-store',
    }),
    apiClient.get<RawBusinessBranding>(`/api/v1/businesses/${businessId}/branding`, {
      auth: true,
      cache: 'no-store',
    }),
  ])

  return {
    name: branding.name ?? business.name,
    description: branding.description ?? '',
    logoUrl: branding.logoUrl ?? '',
    coverImageUrl: branding.coverImageUrl ?? '',
    primaryColor: branding.primaryColor ?? '#0E7C86',
    accentColor: branding.accentColor ?? '#1B9C85',
    typographyPreset:
      branding.typographyPreset ?? toTypographyPreset(branding.fontFamily),
    updatedAt: branding.updatedAt,
  }
}

export async function updateBusinessBranding(
  businessId: string,
  input: BusinessBrandingConfig,
): Promise<BusinessBrandingConfig> {
  const brandingPayload: {
    description?: string
    logoUrl?: string
    coverImageUrl?: string
    primaryColor?: string
    accentColor?: string
    fontFamily?: string
  } = {
    description: input.description ?? '',
    logoUrl: input.logoUrl ?? '',
    coverImageUrl: input.coverImageUrl ?? '',
    primaryColor: input.primaryColor,
    accentColor: input.accentColor,
  }

  if (input.typographyPreset) {
    brandingPayload.fontFamily = fromTypographyPreset(input.typographyPreset)
  }

  const [businessResponse, brandingResponse] = await Promise.all([
    apiClient.patch<ApiResponse<{ business: { name: string } }>>(
      `/api/v1/businesses/${businessId}`,
      { name: input.name },
      { auth: true },
    ),
    apiClient.put<ApiResponse<{ branding: RawBusinessBranding }>>(
      `/api/v1/businesses/${businessId}/branding`,
      brandingPayload,
      {
        auth: true,
      },
    ),
  ])

  return {
    ...input,
    name: businessResponse.business?.name ?? input.name,
    typographyPreset:
      brandingResponse.branding?.typographyPreset ??
      input.typographyPreset ??
      toTypographyPreset(brandingResponse.branding?.fontFamily),
    updatedAt: brandingResponse.branding?.updatedAt,
  }
}

export async function getBusinessQr(businessId: string): Promise<BusinessQrConfig> {
  const [business, qr] = await Promise.all([
    apiClient.get<{ isPublicOrderingEnabled?: boolean }>(
      `/api/v1/businesses/${businessId}`,
      {
        auth: true,
        cache: 'no-store',
      },
    ),
    apiClient.get<RawBusinessQr | null>(`/api/v1/businesses/${businessId}/qr`, {
      auth: true,
      cache: 'no-store',
    }),
  ])

  const qrSettings = qr ?? {}
  const isPublished = business.isPublicOrderingEnabled ?? true
  const qrForeground = qrSettings.foregroundColor ?? '#0F172A'
  const qrBackground = qrSettings.backgroundColor ?? '#FFFFFF'
  const includeLogo = qrSettings.includeLogo ?? true

  return {
    isPublished,
    slug: qrSettings.publicSlug ?? 'menu',
    basePath: '/menu',
    includeTableParam: false,
    tableParamKey: 'table',
    defaultTableCount: 1,
    qrForeground,
    qrBackground,
    includeLogo,
    updatedAt: qrSettings.updatedAt,
    isEnabled: isPublished,
    foregroundColor: qrForeground,
    backgroundColor: qrBackground,
  }
}

export async function updateBusinessQr(
  businessId: string,
  input: BusinessQrConfig,
): Promise<BusinessQrConfig> {
  const qrForeground = input.qrForeground ?? input.foregroundColor ?? '#0F172A'
  const qrBackground = input.qrBackground ?? input.backgroundColor ?? '#FFFFFF'

  const response = await apiClient.put<ApiResponse<{ qr: RawBusinessQr }>>(
    `/api/v1/businesses/${businessId}/qr`,
    {
      publicSlug: input.slug,
      includeLogo: input.includeLogo,
      foregroundColor: qrForeground,
      backgroundColor: qrBackground,
    },
    {
      auth: true,
    },
  )

  return {
    ...input,
    slug: response.qr?.publicSlug ?? input.slug,
    includeLogo: response.qr?.includeLogo ?? input.includeLogo,
    qrForeground: response.qr?.foregroundColor ?? qrForeground,
    qrBackground: response.qr?.backgroundColor ?? qrBackground,
    foregroundColor: response.qr?.foregroundColor ?? qrForeground,
    backgroundColor: response.qr?.backgroundColor ?? qrBackground,
    updatedAt: response.qr?.updatedAt,
  }
}
