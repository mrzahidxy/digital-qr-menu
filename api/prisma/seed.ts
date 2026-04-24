import {
  AuditActorType,
  Badge,
  BusinessStatus,
  LicensePlan,
  LicenseStatus,
  MenuStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client'

import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

const now = new Date()

const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000)

type SeedUser = {
  email: string
  fullName: string
  role: UserRole
  password: string
  isActive?: boolean
}

const usersToSeed: SeedUser[] = [
  {
    email: 'admin@example.com',
    fullName: 'Platform Admin',
    role: UserRole.SUPER_ADMIN,
    password: 'changeMeAdmin1!',
    isActive: true,
  },
  {
    email: 'owner.northwind@example.com',
    fullName: 'Nadia Northwind',
    role: UserRole.OWNER,
    password: 'changeMeOwner1!',
    isActive: true,
  },
  {
    email: 'owner.harbor@example.com',
    fullName: 'Hector Harbor',
    role: UserRole.OWNER,
    password: 'changeMeOwner2!',
    isActive: true,
  },
  {
    email: 'staff.floor@example.com',
    fullName: 'Fatima Floor',
    role: UserRole.STAFF,
    password: 'changeMeStaff1!',
    isActive: true,
  },
  {
    email: 'staff.kitchen@example.com',
    fullName: 'Karim Kitchen',
    role: UserRole.STAFF,
    password: 'changeMeStaff2!',
    isActive: true,
  },
  {
    email: 'staff.inactive@example.com',
    fullName: 'Inactive Staff',
    role: UserRole.STAFF,
    password: 'changeMeStaff3!',
    isActive: false,
  },
]

type SeedBusiness = {
  name: string
  slug: string
  ownerEmail: string
  status: BusinessStatus
  isPublicOrderingEnabled: boolean
  description: string
  primaryColor: string
  accentColor: string
  fontFamily: string
  logoUrl?: string
  coverImageUrl?: string
}

const businessesToSeed: SeedBusiness[] = [
  {
    name: 'Northwind Cafe',
    slug: 'northwind-cafe',
    ownerEmail: 'owner.northwind@example.com',
    status: BusinessStatus.ACTIVE,
    isPublicOrderingEnabled: true,
    description: 'Nordic coffee bar with all-day dining.',
    primaryColor: '#0F766E',
    accentColor: '#1E293B',
    fontFamily: 'Manrope',
  },
  {
    name: 'Harbor House Cafe',
    slug: 'harbor-house-cafe',
    ownerEmail: 'owner.harbor@example.com',
    status: BusinessStatus.ACTIVE,
    isPublicOrderingEnabled: true,
    description: 'Coastal-inspired menu and brunch favorites.',
    primaryColor: '#0E7490',
    accentColor: '#334155',
    fontFamily: 'DM Sans',
  },
  {
    name: 'Sunset Test Kitchen',
    slug: 'sunset-test-kitchen',
    ownerEmail: 'owner.harbor@example.com',
    status: BusinessStatus.SUSPENDED,
    isPublicOrderingEnabled: false,
    description: 'Suspended business fixture for admin and policy tests.',
    primaryColor: '#B45309',
    accentColor: '#7C2D12',
    fontFamily: 'Space Grotesk',
  },
]

type SeedMenu = {
  businessName: string
  name: string
  slug: string
  description?: string
  status: MenuStatus
  isDefault: boolean
  publishedAt?: Date | null
  categories: Array<{
    name: string
    description?: string
    sortOrder: number
    items: Array<{
      name: string
      description?: string
      priceCents: number
      badge: Badge
      isAvailable: boolean
      soldOutUntil?: Date | null
      sortOrder: number
      photoUrl?: string | null
    }>
  }>
}

const menusToSeed: SeedMenu[] = [
  {
    businessName: 'Northwind Cafe',
    name: 'All Day Menu',
    slug: 'all-day-menu',
    description: 'Default public menu used for guest ordering.',
    status: MenuStatus.PUBLISHED,
    isDefault: true,
    publishedAt: daysAgo(7),
    categories: [
      {
        name: 'Signature Coffee',
        description: 'House blends and classics',
        sortOrder: 1,
        items: [
          {
            name: 'Nordic Vanilla Latte',
            description: 'Espresso, steamed milk, vanilla bean',
            priceCents: 550,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: 'Sea Salt Caramel Flat White',
            description: 'Flat white with caramel sea-salt foam',
            priceCents: 575,
            badge: Badge.SPICY,
            isAvailable: true,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Bakery',
        description: 'Freshly baked every morning',
        sortOrder: 2,
        items: [
          {
            name: 'Swedish Cardamom Bun',
            description: 'Cardamom bun with pearl sugar',
            priceCents: 425,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: 'Vegan Berry Oat Bar',
            description: 'Oat crust with berry compote',
            priceCents: 495,
            badge: Badge.VEGAN,
            isAvailable: false,
            soldOutUntil: daysFromNow(1),
            sortOrder: 2,
          },
        ],
      },
    ],
  },
  {
    businessName: 'Northwind Cafe',
    name: 'Seasonal Drafts',
    slug: 'seasonal-drafts',
    description: 'Preview menu not shown publicly',
    status: MenuStatus.DRAFT,
    isDefault: false,
    publishedAt: null,
    categories: [
      {
        name: 'Experimental',
        sortOrder: 1,
        items: [
          {
            name: 'Cocoa Orange Cold Brew',
            priceCents: 625,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    businessName: 'Northwind Cafe',
    name: 'Legacy Archive',
    slug: 'legacy-archive',
    description: 'Archived menu for historical data checks',
    status: MenuStatus.ARCHIVED,
    isDefault: false,
    publishedAt: daysAgo(90),
    categories: [
      {
        name: 'Retired Items',
        sortOrder: 1,
        items: [
          {
            name: 'Maple Pepper Mocha',
            priceCents: 675,
            badge: Badge.SPICY,
            isAvailable: false,
            soldOutUntil: null,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    businessName: 'Harbor House Cafe',
    name: 'Main Menu',
    slug: 'main-menu',
    description: 'Primary menu for Harbor House',
    status: MenuStatus.PUBLISHED,
    isDefault: true,
    publishedAt: daysAgo(14),
    categories: [
      {
        name: 'Coffee & Tea',
        sortOrder: 1,
        items: [
          {
            name: 'Cardamom Cloud Cappuccino',
            priceCents: 565,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: 'Citrus Espresso Tonic',
            priceCents: 525,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Desserts',
        sortOrder: 2,
        items: [
          {
            name: 'Almond Tart',
            priceCents: 475,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    businessName: 'Sunset Test Kitchen',
    name: 'Suspended Preview',
    slug: 'suspended-preview',
    description: 'Published menu attached to a suspended business',
    status: MenuStatus.PUBLISHED,
    isDefault: true,
    publishedAt: daysAgo(2),
    categories: [
      {
        name: 'Test Items',
        sortOrder: 1,
        items: [
          {
            name: 'Hidden Access Burger',
            priceCents: 1299,
            badge: Badge.NONE,
            isAvailable: true,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
]

type SeedOrder = {
  businessName: string
  menuSlug: string
  orderRef: string
  guestName: string | null
  tableLabel: string | null
  orderNote: string | null
  status: OrderStatus
  submittedAt: Date
  items: Array<{ itemName: string; quantity: number; useItemRef: boolean }>
}

const ordersToSeed: SeedOrder[] = [
  {
    businessName: 'Northwind Cafe',
    menuSlug: 'all-day-menu',
    orderRef: 'NW-1001',
    guestName: 'Ava Chen',
    tableLabel: '4',
    orderNote: 'One bun warmed please',
    status: OrderStatus.RECEIVED,
    submittedAt: hoursAgo(1),
    items: [
      { itemName: 'Nordic Vanilla Latte', quantity: 2, useItemRef: true },
      { itemName: 'Swedish Cardamom Bun', quantity: 1, useItemRef: true },
    ],
  },
  {
    businessName: 'Northwind Cafe',
    menuSlug: 'all-day-menu',
    orderRef: 'NW-1002',
    guestName: null,
    tableLabel: '7',
    orderNote: 'Pickup at counter',
    status: OrderStatus.PREPARING,
    submittedAt: hoursAgo(3),
    items: [
      { itemName: 'Sea Salt Caramel Flat White', quantity: 1, useItemRef: true },
    ],
  },
  {
    businessName: 'Northwind Cafe',
    menuSlug: 'all-day-menu',
    orderRef: 'NW-1003',
    guestName: 'Mia Patel',
    tableLabel: '2',
    orderNote: 'No sugar',
    status: OrderStatus.READY,
    submittedAt: hoursAgo(6),
    items: [
      { itemName: 'Nordic Vanilla Latte', quantity: 1, useItemRef: true },
      { itemName: 'Vegan Berry Oat Bar', quantity: 1, useItemRef: false },
    ],
  },
  {
    businessName: 'Northwind Cafe',
    menuSlug: 'all-day-menu',
    orderRef: 'NW-1004',
    guestName: 'Leo Park',
    tableLabel: '9',
    orderNote: null,
    status: OrderStatus.COMPLETED,
    submittedAt: daysAgo(1),
    items: [{ itemName: 'Swedish Cardamom Bun', quantity: 3, useItemRef: true }],
  },
  {
    businessName: 'Harbor House Cafe',
    menuSlug: 'main-menu',
    orderRef: 'HH-2001',
    guestName: null,
    tableLabel: null,
    orderNote: 'Guest cancelled before prep',
    status: OrderStatus.CANCELLED,
    submittedAt: daysAgo(2),
    items: [
      { itemName: 'Citrus Espresso Tonic', quantity: 1, useItemRef: true },
      { itemName: 'Almond Tart', quantity: 2, useItemRef: true },
    ],
  },
]

type SeedLicense = {
  businessName: string
  key: string
  plan: LicensePlan
  status: LicenseStatus
  issuedAt: Date
  currentPeriodEnd: Date | null
  expiresAt: Date | null
  domain: string | null
}

const licensesToSeed: SeedLicense[] = [
  {
    businessName: 'Northwind Cafe',
    key: 'LIC-SEED-MONTHLY-ACTIVE-001',
    plan: LicensePlan.MONTHLY,
    status: LicenseStatus.ACTIVE,
    issuedAt: daysAgo(20),
    currentPeriodEnd: daysFromNow(10),
    expiresAt: daysFromNow(40),
    domain: 'northwind.example.com',
  },
  {
    businessName: 'Harbor House Cafe',
    key: 'LIC-SEED-YEARLY-EXPIRED-002',
    plan: LicensePlan.YEARLY,
    status: LicenseStatus.EXPIRED,
    issuedAt: daysAgo(380),
    currentPeriodEnd: daysAgo(15),
    expiresAt: daysAgo(15),
    domain: 'harbor.example.com',
  },
  {
    businessName: 'Sunset Test Kitchen',
    key: 'LIC-SEED-LIFETIME-SUSPENDED-003',
    plan: LicensePlan.LIFETIME,
    status: LicenseStatus.SUSPENDED,
    issuedAt: daysAgo(200),
    currentPeriodEnd: null,
    expiresAt: null,
    domain: null,
  },
  {
    businessName: 'Northwind Cafe',
    key: 'LIC-SEED-MONTHLY-CANCELLED-004',
    plan: LicensePlan.MONTHLY,
    status: LicenseStatus.CANCELLED,
    issuedAt: daysAgo(60),
    currentPeriodEnd: daysAgo(1),
    expiresAt: daysAgo(1),
    domain: null,
  },
]

type SeedLog = {
  action: string
  entity: string
  entityId?: string | null
  actorType: AuditActorType
  actorEmail?: string
  businessName?: string
  metadata?: Prisma.InputJsonValue
  ip?: string | null
  createdAt: Date
}

const staffAssignments: Array<{ businessName: string; userEmail: string; role: UserRole }> = [
  { businessName: 'Northwind Cafe', userEmail: 'owner.northwind@example.com', role: UserRole.OWNER },
  { businessName: 'Northwind Cafe', userEmail: 'staff.floor@example.com', role: UserRole.STAFF },
  { businessName: 'Northwind Cafe', userEmail: 'staff.kitchen@example.com', role: UserRole.STAFF },
  { businessName: 'Harbor House Cafe', userEmail: 'owner.harbor@example.com', role: UserRole.OWNER },
  { businessName: 'Harbor House Cafe', userEmail: 'staff.kitchen@example.com', role: UserRole.STAFF },
  { businessName: 'Sunset Test Kitchen', userEmail: 'admin@example.com', role: UserRole.SUPER_ADMIN },
]

async function main(): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({}),
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.item.deleteMany({}),
    prisma.category.deleteMany({}),
    prisma.menu.deleteMany({}),
    prisma.qrSettings.deleteMany({}),
    prisma.licenseKey.deleteMany({}),
    prisma.businessUser.deleteMany({}),
    prisma.business.deleteMany({}),
    prisma.user.deleteMany({}),
  ])

  const usersByEmail = new Map<string, { id: string; role: UserRole }>()

  for (const userData of usersToSeed) {
    const passwordHash = await hashPassword(userData.password)
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        passwordHash,
        isActive: userData.isActive ?? true,
      },
      select: { id: true, role: true },
    })

    usersByEmail.set(userData.email, user)
  }

  const getUser = (email: string) => {
    const user = usersByEmail.get(email)
    if (!user) {
      throw new Error(`Missing seeded user: ${email}`)
    }
    return user
  }

  const businessesByName = new Map<string, { id: string; slug: string }>()

  for (const businessData of businessesToSeed) {
    const owner = getUser(businessData.ownerEmail)

    const business = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: businessData.name,
        slug: businessData.slug,
        description: businessData.description,
        logoUrl: businessData.logoUrl,
        coverImageUrl: businessData.coverImageUrl,
        primaryColor: businessData.primaryColor,
        accentColor: businessData.accentColor,
        fontFamily: businessData.fontFamily,
        status: businessData.status,
        isPublicOrderingEnabled: businessData.isPublicOrderingEnabled,
      },
      select: {
        id: true,
        slug: true,
      },
    })

    businessesByName.set(businessData.name, business)
  }

  const getBusiness = (name: string) => {
    const business = businessesByName.get(name)
    if (!business) {
      throw new Error(`Missing seeded business: ${name}`)
    }
    return business
  }

  for (const assignment of staffAssignments) {
    const business = getBusiness(assignment.businessName)
    const user = getUser(assignment.userEmail)

    await prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: assignment.role,
      },
    })
  }

  const menuByBusinessAndSlug = new Map<string, { id: string }>()
  const itemByBusinessAndName = new Map<string, { id: string; priceCents: number }>()

  for (const menuData of menusToSeed) {
    const business = getBusiness(menuData.businessName)

    const menu = await prisma.menu.create({
      data: {
        businessId: business.id,
        name: menuData.name,
        slug: menuData.slug,
        description: menuData.description,
        status: menuData.status,
        isDefault: menuData.isDefault,
        publishedAt: menuData.publishedAt ?? null,
        lastRevalidatedAt: menuData.status === MenuStatus.PUBLISHED ? daysAgo(1) : null,
      },
      select: { id: true },
    })

    menuByBusinessAndSlug.set(`${menuData.businessName}::${menuData.slug}`, menu)

    for (const categoryData of menuData.categories) {
      const category = await prisma.category.create({
        data: {
          menuId: menu.id,
          name: categoryData.name,
          description: categoryData.description,
          sortOrder: categoryData.sortOrder,
        },
        select: { id: true },
      })

      for (const itemData of categoryData.items) {
        const item = await prisma.item.create({
          data: {
            categoryId: category.id,
            name: itemData.name,
            description: itemData.description,
            priceCents: itemData.priceCents,
            badge: itemData.badge,
            photoUrl: itemData.photoUrl ?? null,
            isAvailable: itemData.isAvailable,
            soldOutUntil: itemData.soldOutUntil ?? null,
            sortOrder: itemData.sortOrder,
          },
          select: {
            id: true,
            priceCents: true,
          },
        })

        itemByBusinessAndName.set(`${menuData.businessName}::${itemData.name}`, item)
      }
    }
  }

  for (const businessData of businessesToSeed) {
    const business = getBusiness(businessData.name)
    await prisma.qrSettings.create({
      data: {
        businessId: business.id,
        publicSlug: `${business.slug}-menu`,
        includeLogo: true,
        foregroundColor: '#0F172A',
        backgroundColor: '#FFFFFF',
      },
    })
  }

  for (const orderData of ordersToSeed) {
    const business = getBusiness(orderData.businessName)
    const menu = menuByBusinessAndSlug.get(`${orderData.businessName}::${orderData.menuSlug}`)

    if (!menu) {
      throw new Error(`Missing seeded menu: ${orderData.businessName}/${orderData.menuSlug}`)
    }

    await prisma.order.create({
      data: {
        businessId: business.id,
        menuId: menu.id,
        orderRef: orderData.orderRef,
        guestName: orderData.guestName,
        tableLabel: orderData.tableLabel,
        orderNote: orderData.orderNote,
        status: orderData.status,
        submittedAt: orderData.submittedAt,
        createdAt: orderData.submittedAt,
        updatedAt: orderData.submittedAt,
        items: {
          create: orderData.items.map((item) => {
            const catalogItem = itemByBusinessAndName.get(`${orderData.businessName}::${item.itemName}`)

            if (!catalogItem) {
              throw new Error(`Missing seeded item: ${orderData.businessName}/${item.itemName}`)
            }

            return {
              itemId: item.useItemRef ? catalogItem.id : null,
              itemNameSnapshot: item.itemName,
              priceSnapshot: catalogItem.priceCents,
              quantity: item.quantity,
            }
          }),
        },
      },
    })
  }

  for (const licenseData of licensesToSeed) {
    const business = getBusiness(licenseData.businessName)
    await prisma.licenseKey.create({
      data: {
        businessId: business.id,
        key: licenseData.key,
        plan: licenseData.plan,
        status: licenseData.status,
        domain: licenseData.domain,
        issuedAt: licenseData.issuedAt,
        currentPeriodEnd: licenseData.currentPeriodEnd,
        expiresAt: licenseData.expiresAt,
        signature: Buffer.from(licenseData.key),
      },
    })
  }

  const logsToSeed: SeedLog[] = [
    {
      action: 'Seeded super admin login event',
      entity: 'auth',
      actorType: AuditActorType.USER,
      actorEmail: 'admin@example.com',
      metadata: { source: 'seed', result: 'success' },
      ip: '127.0.0.1',
      createdAt: hoursAgo(3),
    },
    {
      action: 'System revalidated Northwind public menu',
      entity: 'menu',
      actorType: AuditActorType.SYSTEM,
      businessName: 'Northwind Cafe',
      metadata: { revalidated: true, cache: 'public-menu' },
      ip: null,
      createdAt: hoursAgo(2),
    },
    {
      action: 'Guest submitted order HH-2001',
      entity: 'order',
      entityId: 'HH-2001',
      actorType: AuditActorType.GUEST,
      businessName: 'Harbor House Cafe',
      metadata: { flow: 'public-ordering', status: 'cancelled' },
      ip: '203.0.113.55',
      createdAt: daysAgo(2),
    },
  ]

  for (const logData of logsToSeed) {
    const actor = logData.actorEmail ? getUser(logData.actorEmail) : null
    const business = logData.businessName ? getBusiness(logData.businessName) : null

    await prisma.auditLog.create({
      data: {
        businessId: business?.id,
        actorId: actor?.id,
        actorType: logData.actorType,
        action: logData.action,
        entity: logData.entity,
        entityId: logData.entityId ?? null,
        ip: logData.ip ?? null,
        metadata: logData.metadata ?? Prisma.JsonNull,
        createdAt: logData.createdAt,
      },
    })
  }

  console.info('Database has been seeded successfully')
  console.info(`Users: ${usersToSeed.length}`)
  console.info(`Businesses: ${businessesToSeed.length}`)
  console.info(`Menus: ${menusToSeed.length}`)
  console.info(`Orders: ${ordersToSeed.length}`)
  console.info(`Licenses: ${licensesToSeed.length}`)
  console.info('Seed coverage:')
  console.info(`- UserRole: ${Object.values(UserRole).join(', ')}`)
  console.info(`- BusinessStatus: ${Object.values(BusinessStatus).join(', ')}`)
  console.info(`- MenuStatus: ${Object.values(MenuStatus).join(', ')}`)
  console.info(`- Badge: ${Object.values(Badge).join(', ')}`)
  console.info(`- OrderStatus: ${Object.values(OrderStatus).join(', ')}`)
  console.info(`- LicensePlan: ${Object.values(LicensePlan).join(', ')}`)
  console.info(`- LicenseStatus: ${Object.values(LicenseStatus).join(', ')}`)
  console.info(`- AuditActorType: ${Object.values(AuditActorType).join(', ')}`)
}

main()
  .catch((error) => {
    console.error('Seeding failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
