import { randomUUID } from 'crypto'
import { MenuStatus, UserRole } from '@prisma/client'

import type {
  CreatePublicOrderInput,
  ListOrdersQuery,
  OrderItemSnapshot,
  OrderStatus,
  PublicMenuQuery,
  PublicOrderItemInput,
  UpdateOrderStatusInput,
} from '../schemas/order.schema'
import type { AuthenticatedUser } from '../types/user'
import { cache } from '../utils/cache'
import { HttpError } from '../utils/http-error'
import { logger } from '../utils/logger'
import { prisma } from '../utils/prisma'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100
const CACHE_TTL_SECONDS = 60
const ORDER_CACHE_TTL_SECONDS = 60 * 5

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

type OrderListItem = {
  id: string
  orderRef: string
  businessId: string
  tableLabel: string | null
  guestName: string | null
  items: OrderItemSnapshot[]
  itemCount: number
  status: OrderStatus
  orderNote: string | null
  createdAt: string
  updatedAt: string
  business: {
    id: string
    name: string
    ownerId: string
  }
}

type OrderDetail = OrderListItem

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

type PublicMenuItem = {
  id: string
  name: string
  description: string
  price: number
  isAvailable: boolean
  imageUrl: string | null
}

type PublicMenuCategory = {
  id: string
  title: string
  subtitle: string | null
  items: PublicMenuItem[]
}

type PublicMenuResponse = {
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
    categories: PublicMenuCategory[]
  }
}

type PublicOrderConfirmation = {
  orderRef: string
  status: 'received'
  submittedAt: string
}

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT)

  return { page: safePage, limit: safeLimit }
}

const resolveBusinessId = (input: { businessId: string }) => input.businessId

const resolveScope = (actor?: AuthenticatedUser) => {
  if (!actor) {
    return { kind: 'guest' as const, value: null }
  }

  if (actor.role === UserRole.SUPER_ADMIN) {
    return { kind: 'admin' as const, value: null }
  }

  if ((actor.role === UserRole.OWNER || actor.role === UserRole.STAFF) && actor.businessId) {
    return { kind: 'business' as const, value: actor.businessId }
  }

  return { kind: 'forbidden' as const, value: null }
}

type OrderWithRelations = Awaited<ReturnType<typeof fetchOrderById>>

const mapOrder = (order: NonNullable<OrderWithRelations>): OrderListItem => {
  const items = order.items.map((item) => ({
    itemId: item.itemId ?? null,
    itemNameSnapshot: item.itemNameSnapshot,
    quantity: item.quantity,
    priceSnapshot: item.priceSnapshot / 100,
  }))

  return {
    id: order.id,
    orderRef: order.orderRef,
    businessId: order.businessId,
    tableLabel: order.tableLabel,
    guestName: order.guestName,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    status: order.status,
    orderNote: order.orderNote,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    business: order.business,
  }
}

const normalizeFilters = (filters?: Partial<ListOrdersQuery>) => {
  if (!filters) {
    return undefined
  }

  return {
    status: filters.status,
    tableLabel: typeof filters.tableLabel === 'string' ? filters.tableLabel.trim() || undefined : undefined,
    guestName: typeof filters.guestName === 'string' ? filters.guestName.trim() || undefined : undefined,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    sortBy: filters.sortBy ?? 'createdAt',
    sortDirection: filters.sortDirection ?? 'desc',
  }
}

const buildWhere = (scope: ReturnType<typeof resolveScope>, filters?: ReturnType<typeof normalizeFilters>) => {
  const createdAt =
    filters?.createdFrom || filters?.createdTo
      ? {
          ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
          ...(filters.createdTo ? { lte: filters.createdTo } : {}),
        }
      : undefined

  return {
    ...(scope.kind === 'business' ? { businessId: scope.value! } : {}),
    ...(filters?.status?.length ? { status: { in: filters.status } } : {}),
    ...(filters?.tableLabel ? { tableLabel: { contains: filters.tableLabel, mode: 'insensitive' as const } } : {}),
    ...(filters?.guestName ? { guestName: { contains: filters.guestName, mode: 'insensitive' as const } } : {}),
    ...(createdAt ? { createdAt } : {}),
  }
}

const buildOrderBy = (filters?: ReturnType<typeof normalizeFilters>) => {
  const sortBy = filters?.sortBy ?? 'createdAt'
  const sortDirection = filters?.sortDirection ?? 'desc'
  return { [sortBy]: sortDirection }
}

const fetchOrderById = async (orderId: string) =>
  prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      business: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  })

const invalidateOrderCollections = async () => {
  if (!cache.isConnectedToRedis()) {
    return
  }

  await Promise.all([cache.delByPrefix('orders:'), cache.delByPrefix('order:')])
}

export const buildPublicOrderItemSnapshots = (
  inputItems: PublicOrderItemInput[],
  categories: Array<{
    items: Array<{
      id: string
      name: string
      priceCents: number
      isAvailable: boolean
    }>
  }>
): OrderItemSnapshot[] => {
  if (inputItems.length === 0) {
    throw new HttpError(400, 'Order cart cannot be empty')
  }

  const items = new Map<string, { id: string; name: string; priceCents: number; isAvailable: boolean }>()

  for (const category of categories) {
    for (const item of category.items) {
      items.set(item.id, item)
    }
  }

  return inputItems.map((item) => {
    if (item.quantity <= 0) {
      throw new HttpError(400, 'Order item quantities must be greater than zero')
    }

    const menuItem = items.get(item.itemId)

    if (!menuItem) {
      throw new HttpError(400, 'One or more selected items are no longer on the menu')
    }

    if (!menuItem.isAvailable) {
      throw new HttpError(400, `${menuItem.name} is sold out or unavailable`)
    }

    return {
      itemId: menuItem.id,
      itemNameSnapshot: menuItem.name,
      quantity: item.quantity,
      priceSnapshot: menuItem.priceCents / 100,
    }
  })
}

export const getAllowedNextOrderStatuses = (status: OrderStatus) => ORDER_STATUS_TRANSITIONS[status]

export const canTransitionOrderStatus = (current: OrderStatus, next: OrderStatus) =>
  current === next || ORDER_STATUS_TRANSITIONS[current].includes(next)

const assertStatusTransition = (current: OrderStatus, next: OrderStatus) => {
  if (!canTransitionOrderStatus(current, next)) {
    throw new HttpError(400, `Invalid status transition from ${current} to ${next}`)
  }
}

export const orderService = {
  getPublicMenu: async (query: PublicMenuQuery): Promise<PublicMenuResponse> => {
    const businessId = resolveBusinessId(query)
    const cacheKey = `public-menu:${businessId}`

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<PublicMenuResponse>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        accentColor: true,
        fontFamily: true,
        isPublicOrderingEnabled: true,
        qrSettings: {
          select: {
            publicSlug: true,
            includeLogo: true,
            foregroundColor: true,
            backgroundColor: true,
          },
        },
        menus: {
          where: {
            isDefault: true,
            status: MenuStatus.PUBLISHED,
          },
          take: 1,
          select: {
            categories: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                items: {
                  where: { isAvailable: true },
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    priceCents: true,
                    isAvailable: true,
                    photoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!business) {
      throw new HttpError(404, 'Business not found')
    }

    if (!business.isPublicOrderingEnabled) {
      throw new HttpError(403, 'Menu is not published')
    }

    const menu = business.menus[0]

    const response: PublicMenuResponse = {
      businessName: business.name,
      description: business.description ?? null,
      branding: {
        logoUrl: business.logoUrl ?? null,
        coverImageUrl: business.coverImageUrl ?? null,
        primaryColor: business.primaryColor ?? null,
        accentColor: business.accentColor ?? null,
        fontFamily: business.fontFamily ?? null,
      },
      qrSlug: business.qrSettings?.publicSlug ?? 'menu',
      menu: {
        categories: (menu?.categories ?? []).map((category) => ({
          id: category.id,
          title: category.name,
          subtitle: category.description ?? null,
          items: category.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? '',
            price: item.priceCents / 100,
            isAvailable: item.isAvailable,
            imageUrl: item.photoUrl ?? null,
          })),
        })),
      },
    }

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, response, CACHE_TTL_SECONDS)
    }

    return response
  },

  createPublic: async (input: CreatePublicOrderInput): Promise<PublicOrderConfirmation> => {
    const businessId = resolveBusinessId(input)

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        isPublicOrderingEnabled: true,
        menus: {
          where: {
            isDefault: true,
            status: MenuStatus.PUBLISHED,
          },
          take: 1,
          select: {
            id: true,
            categories: {
              select: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    priceCents: true,
                    isAvailable: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!business) {
      throw new HttpError(404, 'Business not found')
    }

    if (!business.isPublicOrderingEnabled) {
      throw new HttpError(403, 'Menu is not published')
    }

    const menu = business.menus[0]
    if (!menu) {
      throw new HttpError(403, 'Menu is not published')
    }

    const items = buildPublicOrderItemSnapshots(input.items, menu.categories)

    const created = await prisma.order.create({
      data: {
        businessId: business.id,
        menuId: menu.id,
        guestName: input.guestName ?? null,
        tableLabel: input.tableLabel ?? null,
        orderNote: input.orderNote ?? null,
        status: 'RECEIVED',
        orderRef: `ORD-${randomUUID().slice(0, 8).toUpperCase()}`,
        items: {
          create: items.map((item) => ({
            itemId: item.itemId ?? null,
            itemNameSnapshot: item.itemNameSnapshot,
            priceSnapshot: Math.round(item.priceSnapshot * 100),
            quantity: item.quantity,
          })),
        },
      },
      select: {
        id: true,
      },
    })

    const order = await fetchOrderById(created.id)
    if (!order) {
      throw new HttpError(500, 'Failed to reload submitted order')
    }

    await invalidateOrderCollections()

    return {
      orderRef: order.orderRef,
      status: 'received',
      submittedAt: order.submittedAt.toISOString(),
    }
  },

  list: async (
    actor: AuthenticatedUser,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    filters?: Partial<ListOrdersQuery>
  ): Promise<PaginatedResponse<OrderListItem>> => {
    const scope = resolveScope(actor)
    if (scope.kind === 'guest' || scope.kind === 'forbidden') {
      throw new HttpError(403, 'Forbidden')
    }

    const { page: currentPage, limit: currentLimit } = normalizePagination(page, limit)
    const skip = (currentPage - 1) * currentLimit
    const normalizedFilters = normalizeFilters(filters)
    const filterString = normalizedFilters ? JSON.stringify(normalizedFilters) : ''
    const scopeIdentifier = scope.kind === 'admin' ? 'all' : String(scope.value)
    const cacheKey = `orders:${scopeIdentifier}:${currentPage}:${currentLimit}:${filterString}`

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<PaginatedResponse<OrderListItem>>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const where = buildWhere(scope, normalizedFilters)
    const orderBy = buildOrderBy(normalizedFilters)

    const [orders, totalItems] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: currentLimit,
        include: {
          items: true,
          business: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit)
    const response: PaginatedResponse<OrderListItem> = {
      data: orders.map(mapOrder),
      meta: {
        page: currentPage,
        limit: currentLimit,
        totalItems,
        totalPages,
      },
    }

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, response, CACHE_TTL_SECONDS)
    }

    return response
  },

  getById: async (orderId: string, actor: AuthenticatedUser): Promise<OrderDetail> => {
    const scope = resolveScope(actor)
    if (scope.kind === 'guest' || scope.kind === 'forbidden') {
      throw new HttpError(403, 'Forbidden')
    }

    const cacheKey = `order:${orderId}`

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<OrderDetail>(cacheKey)
      if (cached) {
        if (scope.kind === 'business' && cached.businessId !== scope.value) {
          throw new HttpError(403, 'Forbidden')
        }
        return cached
      }
    }

    const order = await fetchOrderById(orderId)
    if (!order) {
      throw new HttpError(404, 'Order not found')
    }

    if (scope.kind === 'business' && order.businessId !== scope.value) {
      throw new HttpError(403, 'Forbidden')
    }

    const response = mapOrder(order)

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, response, ORDER_CACHE_TTL_SECONDS)
    }

    return response
  },

  updateStatus: async (orderId: string, input: UpdateOrderStatusInput, actor: AuthenticatedUser) => {
    const scope = resolveScope(actor)
    if (scope.kind === 'guest' || scope.kind === 'forbidden') {
      throw new HttpError(403, 'Forbidden')
    }

    const currentOrder = await fetchOrderById(orderId)
    if (!currentOrder) {
      throw new HttpError(404, 'Order not found')
    }

    if (scope.kind === 'business' && currentOrder.businessId !== scope.value) {
      throw new HttpError(403, 'Forbidden')
    }

    const currentStatus = currentOrder.status

    assertStatusTransition(currentStatus, input.status)

    if (currentStatus === input.status) {
      return mapOrder(currentOrder)
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: input.status },
    })

    const order = await fetchOrderById(orderId)
    if (!order) {
      throw new HttpError(500, 'Failed to reload updated order')
    }

    await invalidateOrderCollections()
    logger.info(
      {
        category: 'ORDER',
        orderId: order.id,
        orderRef: order.orderRef,
        businessId: order.businessId,
        previousStatus: currentStatus,
        nextStatus: input.status,
        actorId: actor.id,
      },
      'Order status updated'
    )

    return mapOrder(order)
  },
}
