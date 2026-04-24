import { Prisma, UserRole } from '@prisma/client';

import { cache } from '../utils/cache';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import type { AuthenticatedUser } from '../types/user';
import type {
  BusinessWorkspaceQueryInput,
  ListBusinessesQueryInput,
  UpdateBusinessInput,
  CreateMenuInput,
  UpdateMenuInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateItemInput,
  UpdateItemInput,
  UpsertQrSettingsInput,
  UpdateBusinessBrandingInput,
} from '../schemas/business.schema';

const BUSINESS_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverImageUrl: true,
  primaryColor: true,
  accentColor: true,
  fontFamily: true,
  status: true,
  isPublicOrderingEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

type BusinessDetail = Prisma.BusinessGetPayload<{ select: typeof BUSINESS_SELECT }>;

type BusinessScope = {
  business: BusinessDetail;
  isOwner: boolean;
  isStaff: boolean;
  isAdmin: boolean;
};

type BusinessWorkspaceResponse = {
  business: BusinessDetail;
  metrics: {
    totalOrders: number;
    ordersLast30d: number;
    activeOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    staffCount: number;
    activeLicenseCount: number;
  };
  recentOrders: Array<{
    id: string;
    tableLabel: string | null;
    guestName: string | null;
    status: string;
    createdAt: Date;
  }>;
  recentStaff: Array<{
    role: UserRole;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: UserRole;
    };
  }>;
};

const ADMIN_LIST_CACHE_TTL_SECONDS = 30;
const ADMIN_DETAIL_CACHE_TTL_SECONDS = 30;

const ADMIN_BUSINESS_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  menus: {
    select: {
      id: true,
      status: true,
    },
  },
  _count: {
    select: {
      users: true,
      orders: true,
    },
  },
} as const;

const ADMIN_BUSINESS_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverImageUrl: true,
  primaryColor: true,
  accentColor: true,
  fontFamily: true,
  status: true,
  isPublicOrderingEnabled: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  },
  menus: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          categories: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  users: {
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  _count: {
    select: {
      menus: true,
      users: true,
      orders: true,
    },
  },
} as const;

type AdminBusinessListRecord = Prisma.BusinessGetPayload<{
  select: typeof ADMIN_BUSINESS_LIST_SELECT;
}>;

type AdminBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    fullName: string | null;
  };
  createdAt: string;
  updatedAt: string;
  totalMenus: number;
  publishedMenus: number;
  totalOrders: number;
  status: string;
  userCount: number;
};

type AdminBusinessDetail = AdminBusinessSummary & {
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
  isPublicOrderingEnabled: boolean;
  owner: AdminBusinessSummary['owner'] & {
    role: UserRole;
  };
  users: Array<{
    role: UserRole;
    createdAt: string;
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: UserRole;
    };
  }>;
  recentMenus: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    categoryCount: number;
  }>;
};

type AdminBusinessListResponse = {
  data: AdminBusinessSummary[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const normalizePagination = (page?: number, limit?: number) => {
  const safePage = Number.isFinite(page ?? NaN) && (page ?? 0) > 0 ? Math.floor(page as number) : 1;
  const requestedLimit = Number.isFinite(limit ?? NaN) && (limit ?? 0) > 0 ? Math.floor(limit as number) : 10;
  return {
    page: safePage,
    limit: Math.min(requestedLimit, 50),
  };
};

const normalizeSearch = (search?: string) => {
  const trimmed = search?.trim();
  return trimmed ? trimmed : undefined;
};

const getBusinessScope = async (
  businessId: string,
  actor: AuthenticatedUser
): Promise<BusinessScope> => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      ...BUSINESS_SELECT,
      users: {
        where: { userId: actor.id },
        select: { userId: true },
      },
    },
  });

  if (!business) {
    throw new HttpError(404, 'Business not found');
  }

  const { users, ...businessData } = business;

  return {
    business: businessData,
    isOwner: business.ownerId === actor.id,
    isStaff: users.length > 0,
    isAdmin: actor.role === UserRole.SUPER_ADMIN,
  };
};

const assertOwnerOrAdmin = (scope: BusinessScope, action: string) => {
  if (!scope.isAdmin && !scope.isOwner) {
    throw new HttpError(403, `You do not have permission to ${action} for this business`);
  }
};

const assertStaffOrOwnerOrAdmin = (scope: BusinessScope, action: string) => {
  if (!scope.isAdmin && !scope.isOwner && !scope.isStaff) {
    throw new HttpError(403, `You do not have permission to ${action} for this business`);
  }
};

const requireAdmin = (actor: AuthenticatedUser) => {
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, 'You do not have permission to manage businesses');
  }
};

const invalidatePublicMenuCache = async (businessId: string) => {
  if (!cache.isConnectedToRedis()) {
    return;
  }

  await cache.del(`public-menu:${businessId}`);
};

const adminListCacheKey = (page: number, limit: number, search?: string) =>
  `businesses:list:${page}:${limit}:${search ?? ''}`;

const adminDetailCacheKey = (businessId: string) => `businesses:detail:${businessId}`;

const invalidateAdminBusinessCaches = async () => {
  if (!cache.isConnectedToRedis()) {
    return;
  }

  await Promise.all([
    cache.delByPrefix('businesses:list:'),
    cache.delByPrefix('businesses:detail:'),
  ]);
};

const formatAdminSummary = (record: AdminBusinessListRecord): AdminBusinessSummary => {
  const publishedMenus = record.menus.filter((menu) => menu.status === 'PUBLISHED').length;

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    ownerId: record.ownerId,
    owner: {
      id: record.owner.id,
      email: record.owner.email,
      fullName: record.owner.fullName,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    totalMenus: record.menus.length,
    publishedMenus,
    totalOrders: record._count.orders,
    status: record.status,
    userCount: record._count.users,
  };
};

const ensureMenuBelongsToBusiness = async (businessId: string, menuId: string) => {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { id: true, businessId: true },
  });

  if (!menu || menu.businessId !== businessId) {
    throw new HttpError(404, 'Menu not found');
  }

  return menu;
};

const ensureCategoryBelongsToMenu = async (menuId: string, categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, menuId: true },
  });

  if (!category || category.menuId !== menuId) {
    throw new HttpError(404, 'Category not found');
  }

  return category;
};

const ensureItemBelongsToCategory = async (categoryId: string, itemId: string) => {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, categoryId: true },
  });

  if (!item || item.categoryId !== categoryId) {
    throw new HttpError(404, 'Item not found');
  }

  return item;
};

export const businessService = {
  listForAdmin: async (
    actor: AuthenticatedUser,
    query?: ListBusinessesQueryInput
  ): Promise<AdminBusinessListResponse> => {
    requireAdmin(actor);

    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const search = normalizeSearch(query?.search);
    const skip = (page - 1) * limit;
    const where: Prisma.BusinessWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { owner: { email: { contains: search, mode: 'insensitive' } } },
            { owner: { fullName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const cacheKey = adminListCacheKey(page, limit, search);

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<AdminBusinessListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [businesses, totalItems] = await Promise.all([
      prisma.business.findMany({
        where,
        select: ADMIN_BUSINESS_LIST_SELECT,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.business.count({ where }),
    ]);

    const response: AdminBusinessListResponse = {
      data: businesses.map((business) => formatAdminSummary(business)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, response, ADMIN_LIST_CACHE_TTL_SECONDS);
    }

    return response;
  },

  getByIdForAdmin: async (actor: AuthenticatedUser, businessId: string): Promise<AdminBusinessDetail> => {
    requireAdmin(actor);

    const cacheKey = adminDetailCacheKey(businessId);

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<AdminBusinessDetail>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: ADMIN_BUSINESS_DETAIL_SELECT,
    });

    if (!business) {
      throw new HttpError(404, 'Business not found');
    }

    const detail: AdminBusinessDetail = {
      ...formatAdminSummary(business),
      description: business.description,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      primaryColor: business.primaryColor,
      accentColor: business.accentColor,
      fontFamily: business.fontFamily,
      isPublicOrderingEnabled: business.isPublicOrderingEnabled,
      owner: {
        id: business.owner.id,
        email: business.owner.email,
        fullName: business.owner.fullName,
        role: business.owner.role,
      },
      users: business.users.map((membership) => ({
        role: membership.role,
        createdAt: membership.createdAt.toISOString(),
        user: {
          id: membership.user.id,
          email: membership.user.email,
          fullName: membership.user.fullName,
          role: membership.user.role,
        },
      })),
      recentMenus: business.menus.slice(0, 5).map((menu) => ({
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        status: menu.status,
        isDefault: menu.isDefault,
        createdAt: menu.createdAt.toISOString(),
        updatedAt: menu.updatedAt.toISOString(),
        categoryCount: menu._count.categories,
      })),
    };

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, detail, ADMIN_DETAIL_CACHE_TTL_SECONDS);
    }

    return detail;
  },

  create: async (
    input: { name?: string; ownerId?: string },
    actor: AuthenticatedUser
  ): Promise<BusinessDetail> => {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to create a business');
    }

    if (actor.role === UserRole.SUPER_ADMIN && !input.ownerId) {
      throw new HttpError(400, 'ownerId is required when creating a business as a super admin');
    }

    if (!input.name) {
      throw new HttpError(400, 'Business name is required');
    }

    const ownerId = input.ownerId ?? actor.id;

    if (actor.role !== UserRole.SUPER_ADMIN && ownerId !== actor.id) {
      throw new HttpError(403, 'You can only create a business for yourself');
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true },
    });

    if (!owner) {
      throw new HttpError(404, 'Owner not found');
    }

    if (owner.role !== UserRole.OWNER) {
      throw new HttpError(400, 'Owner must have the OWNER role');
    }

    const existing = await prisma.business.findFirst({
      where: { ownerId },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, 'This owner already has a business');
    }

    const business = await prisma.business.create({
      data: {
        name: input.name,
        ownerId,
        slug: slugify(input.name),
      },
      select: BUSINESS_SELECT,
    });

    await invalidateAdminBusinessCaches();

    return business;
  },

  removeForAdmin: async (actor: AuthenticatedUser, businessId: string): Promise<void> => {
    requireAdmin(actor);

    const existing = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Business not found');
    }

    await prisma.business.delete({
      where: { id: businessId },
    });

    await invalidateAdminBusinessCaches();
  },

  getById: async (businessId: string, actor: AuthenticatedUser): Promise<BusinessDetail> => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view the business profile');
    return scope.business;
  },

  update: async (
    businessId: string,
    input: UpdateBusinessInput,
    actor: AuthenticatedUser
  ): Promise<BusinessDetail> => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'update the business profile');

    const business = await prisma.business.update({
      where: { id: scope.business.id },
      data: {
        name: input.name,
      },
      select: BUSINESS_SELECT,
    });

    await invalidateAdminBusinessCaches();

    return business;
  },

  listMenus: async (businessId: string, actor: AuthenticatedUser) => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view menus');

    return prisma.menu.findMany({
      where: { businessId: scope.business.id },
      include: { _count: { select: { categories: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  createMenu: async (
    businessId: string,
    input: Partial<CreateMenuInput>,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'create menus');

    if (!input.name || !input.slug || !input.status) {
      throw new HttpError(400, 'name, slug, and status are required');
    }

    const existing = await prisma.menu.findFirst({
      where: {
        businessId: scope.business.id,
        slug: input.slug,
      },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, 'A menu with this slug already exists');
    }

    const menu = await prisma.menu.create({
      data: {
        business: { connect: { id: scope.business.id } },
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: input.status,
        isDefault: input.isDefault ?? false,
      },
    });

    await invalidatePublicMenuCache(scope.business.id);

    return menu;
  },

  updateMenu: async (
    businessId: string,
    menuId: string,
    input: UpdateMenuInput,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'update menus');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);

    if (input.slug) {
      const existing = await prisma.menu.findFirst({
        where: {
          businessId: scope.business.id,
          slug: input.slug,
          id: { not: menuId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new HttpError(409, 'A menu with this slug already exists');
      }
    }

    const menu = await prisma.menu.update({
      where: { id: menuId },
      data: input,
    });

    await invalidatePublicMenuCache(scope.business.id);

    return menu;
  },

  deleteMenu: async (businessId: string, menuId: string, actor: AuthenticatedUser): Promise<void> => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'delete menus');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);

    await prisma.menu.delete({
      where: { id: menuId },
    });

    await invalidatePublicMenuCache(scope.business.id);
  },

  listCategories: async (businessId: string, menuId: string, actor: AuthenticatedUser) => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view categories');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);

    return prisma.category.findMany({
      where: { menuId },
      orderBy: { sortOrder: 'asc' },
    });
  },

  createCategory: async (
    businessId: string,
    menuId: string,
    input: Partial<CreateCategoryInput>,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'create categories');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);

    if (!input.name) {
      throw new HttpError(400, 'Category name is required');
    }

    const category = await prisma.category.create({
      data: {
        menu: { connect: { id: menuId } },
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    await invalidatePublicMenuCache(scope.business.id);

    return category;
  },

  updateCategory: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    input: UpdateCategoryInput,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'update categories');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: input,
    });

    await invalidatePublicMenuCache(scope.business.id);

    return category;
  },

  deleteCategory: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    actor: AuthenticatedUser
  ): Promise<void> => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'delete categories');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);

    await prisma.category.delete({
      where: { id: categoryId },
    });

    await invalidatePublicMenuCache(scope.business.id);
  },

  listItems: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view items');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);

    return prisma.item.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });
  },

  createItem: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    input: Partial<CreateItemInput>,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'create items');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);

    if (!input.name || input.priceCents === undefined || !input.badge) {
      throw new HttpError(400, 'name, priceCents, and badge are required');
    }

    const item = await prisma.item.create({
      data: {
        category: { connect: { id: categoryId } },
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        badge: input.badge,
        photoUrl: input.photoUrl,
        isAvailable: input.isAvailable ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    await invalidatePublicMenuCache(scope.business.id);

    return item;
  },

  updateItem: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    itemId: string,
    input: UpdateItemInput,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'update items');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);
    await ensureItemBelongsToCategory(categoryId, itemId);

    const item = await prisma.item.update({
      where: { id: itemId },
      data: input,
    });

    await invalidatePublicMenuCache(scope.business.id);

    return item;
  },

  deleteItem: async (
    businessId: string,
    menuId: string,
    categoryId: string,
    itemId: string,
    actor: AuthenticatedUser
  ): Promise<void> => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'delete items');
    await ensureMenuBelongsToBusiness(scope.business.id, menuId);
    await ensureCategoryBelongsToMenu(menuId, categoryId);
    await ensureItemBelongsToCategory(categoryId, itemId);

    await prisma.item.delete({
      where: { id: itemId },
    });

    await invalidatePublicMenuCache(scope.business.id);
  },

  upsertQrSettings: async (
    businessId: string,
    input: UpsertQrSettingsInput,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'update QR settings');

    const qrSettings = await prisma.qrSettings.upsert({
      where: { businessId: scope.business.id },
      update: input,
      create: {
        businessId: scope.business.id,
        ...input,
      },
    });

    await invalidatePublicMenuCache(scope.business.id);

    return qrSettings;
  },

  getQrSettings: async (businessId: string, actor: AuthenticatedUser) => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view QR settings');

    return prisma.qrSettings.findUnique({
      where: { businessId: scope.business.id },
    });
  },

  getBranding: async (businessId: string, actor: AuthenticatedUser) => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view branding');

    return prisma.business.findUnique({
      where: { id: scope.business.id },
      select: {
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        accentColor: true,
        fontFamily: true,
        updatedAt: true,
      },
    });
  },

  updateBranding: async (
    businessId: string,
    input: UpdateBusinessBrandingInput,
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'update branding');

    const business = await prisma.business.update({
      where: { id: scope.business.id },
      data: input,
      select: {
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        accentColor: true,
        fontFamily: true,
        updatedAt: true,
      },
    });

    await invalidatePublicMenuCache(scope.business.id);

    return business;
  },

  getWorkspace: async (
    businessId: string,
    actor: AuthenticatedUser,
    options: BusinessWorkspaceQueryInput
  ): Promise<BusinessWorkspaceResponse> => {
    const scope = await getBusinessScope(businessId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view workspace overview');

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      staffCount,
      activeLicenseCount,
      totalOrders,
      ordersLast30d,
      activeOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      recentOrders,
      recentStaff,
    ] = await prisma.$transaction([
      prisma.businessUser.count({
        where: { businessId: scope.business.id },
      }),
      prisma.licenseKey.count({
        where: {
          businessId: scope.business.id,
          status: 'ACTIVE',
        },
      }),
      prisma.order.count({
        where: { businessId: scope.business.id },
      }),
      prisma.order.count({
        where: {
          businessId: scope.business.id,
          createdAt: { gte: since },
        },
      }),
      prisma.order.count({
        where: {
          businessId: scope.business.id,
          status: { in: ['RECEIVED', 'PREPARING', 'READY'] },
        },
      }),
      prisma.order.count({
        where: {
          businessId: scope.business.id,
          status: { in: ['RECEIVED'] },
        },
      }),
      prisma.order.count({
        where: {
          businessId: scope.business.id,
          status: { in: ['COMPLETED'] },
        },
      }),
      prisma.order.count({
        where: {
          businessId: scope.business.id,
          status: { in: ['CANCELLED'] },
        },
      }),
      prisma.order.findMany({
        where: { businessId: scope.business.id },
        orderBy: { createdAt: 'desc' },
        take: options.recentOrdersLimit,
        select: {
          id: true,
          tableLabel: true,
          guestName: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.businessUser.findMany({
        where: { businessId: scope.business.id },
        select: {
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.recentStaffLimit,
      }),
    ]);

    return {
      business: scope.business,
      metrics: {
        totalOrders,
        ordersLast30d,
        activeOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        staffCount,
        activeLicenseCount,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        tableLabel: order.tableLabel,
        guestName: order.guestName,
        status: order.status,
        createdAt: order.createdAt,
      })),
      recentStaff,
    };
  },

  listBusinessUsers: async (businessId: string, actor: AuthenticatedUser) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'view business users');

    return prisma.businessUser.findMany({
      where: { businessId: scope.business.id },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  assignBusinessUser: async (
    businessId: string,
    input: { userId?: string; role?: UserRole },
    actor: AuthenticatedUser
  ) => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'assign business users');

    if (!input.userId || !input.role) {
      throw new HttpError(400, 'userId and role are required');
    }

    if (input.userId === scope.business.ownerId) {
      throw new HttpError(400, 'The owner cannot be assigned as a business user');
    }

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return prisma.businessUser.upsert({
      where: {
        businessId_userId: {
          businessId: scope.business.id,
          userId: input.userId,
        },
      },
      update: {
        role: input.role,
      },
      create: {
        businessId: scope.business.id,
        userId: input.userId,
        role: input.role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  },

  removeBusinessUser: async (
    businessId: string,
    userId: string,
    actor: AuthenticatedUser
  ): Promise<void> => {
    const scope = await getBusinessScope(businessId, actor);
    assertOwnerOrAdmin(scope, 'remove business users');

    const existing = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: scope.business.id,
          userId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Business user assignment not found');
    }

    await prisma.businessUser.delete({
      where: {
        businessId_userId: {
          businessId: scope.business.id,
          userId,
        },
      },
    });
  },
};
