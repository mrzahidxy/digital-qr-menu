import { OAS3Definition, OAS3Options } from 'swagger-jsdoc';

import { env } from '../utils/env';

const healthPaths: OAS3Definition['paths'] = {
  '/health': {
    servers: [
      {
        url: '/',
        description: 'Root server (health & non-versioned routes)',
      },
    ],
    get: {
      tags: ['Health'],
      summary: 'Service health status',
      description:
        'Returns the health status of the API along with database and cache connectivity information.',
      responses: {
        200: {
          description: 'Service is healthy or degraded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    description: '`ok` when all services are healthy, otherwise `degraded`.',
                    example: 'ok',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'ISO timestamp when the health check was performed.',
                  },
                  uptime: {
                    type: 'number',
                    description: 'Process uptime in seconds.',
                    example: 123.45,
                  },
                  services: {
                    type: 'object',
                    properties: {
                      database: {
                        type: 'string',
                        enum: ['up', 'down'],
                      },
                      cache: {
                        type: 'string',
                        enum: ['up', 'down'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        503: {
          description: 'One or more services are unavailable.',
        },
      },
    },
  },
};

const authPaths: OAS3Definition['paths'] = {
  '/auth/register': {
    post: {
      summary: 'Register a new user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'fullName'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                  minLength: 8,
                },
                fullName: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User registered successfully',
        },
        400: {
          description: 'Validation error',
        },
        409: {
          description: 'User already exists',
        },
      },
    },
  },
  '/auth/login': {
    post: {
      summary: 'Login user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Invalid credentials',
        },
      },
    },
  },
  '/auth/logout': {
    post: {
      summary: 'Logout current session',
      tags: ['Auth'],
      responses: {
        204: {
          description: 'Logged out successfully',
        },
      },
    },
  },
};

const uploadPaths: OAS3Definition['paths'] = {
  '/upload': {
    post: {
      summary: 'Upload an image asset',
      tags: ['Upload'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'File uploaded successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  upload: {
                    type: 'object',
                    required: ['url', 'publicId', 'bytes', 'format'],
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      publicId: { type: 'string' },
                      bytes: { type: 'integer' },
                      format: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        413: { description: 'File exceeds maximum upload size' },
        503: { description: 'Upload storage unavailable' },
      },
    },
  },
};

const orderPaths: OAS3Definition['paths'] = {
  '/orders/public/menu': {
    get: {
      operationId: 'getPublicMenu',
      summary: 'Get a published QR menu',
      tags: ['Orders'],
      parameters: [
        {
          in: 'query',
          name: 'businessId',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Published business identifier.',
        },
      ],
      responses: {
        200: {
          description: 'Published menu payload returned successfully.',
        },
      },
    },
  },
  '/orders/public': {
    post: {
      operationId: 'createPublicOrder',
      summary: 'Create a guest order from the public menu',
      tags: ['Orders'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items'],
              properties: {
                businessId: {
                  type: 'string',
                  format: 'uuid',
                },
                guestName: {
                  type: 'string',
                },
                tableLabel: {
                  type: 'string',
                },
                orderNote: {
                  type: 'string',
                },
                items: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['itemId', 'quantity'],
                    properties: {
                      itemId: {
                        type: 'string',
                      },
                      quantity: {
                        type: 'integer',
                        minimum: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Guest order created successfully.',
        },
        400: {
          description: 'Validation error.',
        },
      },
    },
  },
  '/orders': {
    get: {
      operationId: 'listOrders',
      summary: 'List guest orders for the authenticated business',
      tags: ['Orders'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
          },
          description: 'Comma-separated order statuses.',
        },
        {
          in: 'query',
          name: 'tableLabel',
          schema: {
            type: 'string',
          },
          description: 'Filter by table label.',
        },
        {
          in: 'query',
          name: 'guestName',
          schema: {
            type: 'string',
          },
          description: 'Filter by guest name.',
        },
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Page number.',
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Items per page.',
        },
      ],
      responses: {
        200: {
          description: 'Order list returned successfully.',
        },
      },
    },
  },
  '/orders/{id}': {
    get: {
      operationId: 'getOrderById',
      summary: 'Get a guest order by ID',
      tags: ['Orders'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'Order details returned successfully.',
        },
        404: {
          description: 'Order not found.',
        },
      },
    },
  },
  '/orders/{id}/status': {
    patch: {
      operationId: 'updateOrderStatus',
      summary: 'Update guest order status',
      tags: ['Orders'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Order status updated successfully.',
        },
        400: {
          description: 'Validation error.',
        },
        401: {
          description: 'Unauthorized.',
        },
        403: {
          description: 'Forbidden.',
        },
        404: {
          description: 'Order not found.',
        },
      },
    },
  },
};

const userPaths: OAS3Definition['paths'] = {
  '/users': {
    get: {
      summary: 'List users',
      description: 'Returns a paginated list of users. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Page number (defaults to 1)',
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          description: 'Number of users per page (defaults to 10)',
        },
        {
          in: 'query',
          name: 'role',
          schema: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'OWNER', 'STAFF'],
          },
          description: 'Filter users by role',
        },
        {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
          },
          description: 'Search by email or full name (case-insensitive)',
          example: 'john',
        },
      ],
      responses: {
        200: {
          description: 'List of users',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
    post: {
      summary: 'Create a new user',
      description: 'Creates a new user. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'fullName', 'role'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                fullName: {
                  type: 'string',
                  nullable: true,
                },
                password: {
                  type: 'string',
                  minLength: 8,
                },
                role: {
                  type: 'string',
                  enum: ['SUPER_ADMIN', 'OWNER', 'STAFF'],
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User created successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        409: {
          description: 'User with the same email already exists',
        },
      },
    },
  },
  '/users/{id}': {
    get: {
      summary: 'Get user by ID',
      description: 'Returns the user details. Users may view their own profile; admins can view any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'User details',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
    patch: {
      summary: 'Update user profile',
      description: 'Allows users to update their own profile details. Admins can update any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                fullName: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
        409: {
          description: 'Email conflict',
        },
      },
    },
    delete: {
      summary: 'Delete a user',
      description: 'Deletes a user account. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        204: {
          description: 'User deleted successfully',
        },
        400: {
          description: 'Cannot delete the currently authenticated user',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
  },
  '/users/{id}/role': {
    patch: {
      summary: 'Update user role',
      description:
        'Updates the role for the specified user. Requires admin privileges and cannot target the current user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['role'],
              properties: {
                role: {
                  type: 'string',
                  enum: ['SUPER_ADMIN', 'OWNER', 'STAFF'],
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User role updated successfully',
        },
        400: {
          description: 'Invalid request or attempting to update self role',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
  },
};

const businessPaths: OAS3Definition['paths'] = {
  '/businesses': {
    post: {
      summary: 'Create a business',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                ownerId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Business created successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}': {
    get: {
      summary: 'Get business by ID',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Business fetched successfully' },
        401: { description: 'Unauthorized' },
        404: { description: 'Business not found' },
      },
    },
    patch: {
      summary: 'Update business',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Business updated successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/workspace': {
    get: {
      summary: 'Get business workspace summary',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'recentOrdersLimit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        { in: 'query', name: 'recentStaffLimit', schema: { type: 'integer', minimum: 1, maximum: 20 } },
      ],
      responses: {
        200: { description: 'Workspace returned successfully' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/branding': {
    get: {
      summary: 'Get business branding',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Branding returned successfully' },
        401: { description: 'Unauthorized' },
      },
    },
    put: {
      summary: 'Update business branding',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                logoUrl: { type: 'string', format: 'uri' },
                coverImageUrl: { type: 'string', format: 'uri' },
                primaryColor: { type: 'string', example: '#0F172A' },
                accentColor: { type: 'string', example: '#22C55E' },
                fontFamily: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Branding updated successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/qr': {
    get: {
      summary: 'Get QR settings',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'QR settings returned successfully' },
        401: { description: 'Unauthorized' },
      },
    },
    put: {
      summary: 'Upsert QR settings',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['includeLogo'],
              properties: {
                publicSlug: { type: 'string' },
                includeLogo: { type: 'boolean' },
                foregroundColor: { type: 'string', example: '#0F172A' },
                backgroundColor: { type: 'string', example: '#FFFFFF' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'QR settings updated successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/menus': {
    get: {
      summary: 'List menus',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Menus returned successfully' },
        401: { description: 'Unauthorized' },
      },
    },
    post: {
      summary: 'Create menu',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'slug', 'status'],
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
                isDefault: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Menu created successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/menus/{menuId}': {
    patch: {
      summary: 'Update menu',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
                isDefault: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Menu updated successfully' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
      },
    },
    delete: {
      summary: 'Delete menu',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Menu deleted successfully' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/businesses/{businessId}/menus/{menuId}/categories': {
    get: {
      summary: 'List categories for menu',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Categories returned successfully' },
        401: { description: 'Unauthorized' },
      },
    },
    post: {
      summary: 'Create category',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                sortOrder: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Category created successfully' },
        400: { description: 'Validation error' },
      },
    },
  },
  '/businesses/{businessId}/menus/{menuId}/categories/{categoryId}': {
    patch: {
      summary: 'Update category',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                sortOrder: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Category updated successfully' },
      },
    },
    delete: {
      summary: 'Delete category',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Category deleted successfully' },
      },
    },
  },
  '/businesses/{businessId}/menus/{menuId}/categories/{categoryId}/items': {
    get: {
      summary: 'List items for category',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Items returned successfully' },
      },
    },
    post: {
      summary: 'Create item',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'priceCents', 'badge'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                priceCents: { type: 'integer', minimum: 0 },
                badge: { type: 'string', enum: ['VEGAN', 'SPICY', 'NONE'] },
                photoUrl: { type: 'string', format: 'uri' },
                isAvailable: { type: 'boolean' },
                sortOrder: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Item created successfully' },
      },
    },
  },
  '/businesses/{businessId}/menus/{menuId}/categories/{categoryId}/items/{itemId}': {
    patch: {
      summary: 'Update item',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'itemId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                priceCents: { type: 'integer', minimum: 0 },
                badge: { type: 'string', enum: ['VEGAN', 'SPICY', 'NONE'] },
                photoUrl: { type: 'string', format: 'uri' },
                isAvailable: { type: 'boolean' },
                sortOrder: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Item updated successfully' },
      },
    },
    delete: {
      summary: 'Delete item',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'menuId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'itemId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Item deleted successfully' },
      },
    },
  },
  '/businesses/{businessId}/staff': {
    get: {
      summary: 'List business staff assignments',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Staff assignments returned successfully' },
      },
    },
    post: {
      summary: 'Assign user to business staff',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId', 'role'],
              properties: {
                userId: { type: 'string', format: 'uuid' },
                role: { type: 'string', enum: ['SUPER_ADMIN', 'OWNER', 'STAFF'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Staff assigned successfully' },
      },
    },
  },
  '/businesses/{businessId}/staff/{userId}': {
    delete: {
      summary: 'Remove user from business staff',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Staff member removed successfully' },
      },
    },
  },
};

const licensePaths: OAS3Definition['paths'] = {
  '/licenses': {
    get: {
      summary: 'List licenses',
      tags: ['Licenses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'search', schema: { type: 'string' } },
        { in: 'query', name: 'plan', schema: { type: 'string', enum: ['MONTHLY', 'YEARLY', 'LIFETIME'] } },
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] } },
        { in: 'query', name: 'businessId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1 } },
        { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['key', 'plan', 'status', 'issuedAt', 'expiresAt', 'createdAt', 'updatedAt'] } },
        { in: 'query', name: 'sortDirection', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        200: { description: 'License list returned successfully' },
      },
    },
    post: {
      summary: 'Create a license',
      tags: ['Licenses'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['plan', 'businessId'],
              properties: {
                key: { type: 'string' },
                plan: { type: 'string', enum: ['MONTHLY', 'YEARLY', 'LIFETIME'] },
                status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] },
                issuedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time', nullable: true },
                businessId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'License created successfully' },
      },
    },
  },
  '/licenses/{id}': {
    get: {
      summary: 'Get license by ID',
      tags: ['Licenses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'License detail returned successfully' },
        404: { description: 'License not found' },
      },
    },
    put: {
      summary: 'Update a license',
      tags: ['Licenses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                plan: { type: 'string', enum: ['MONTHLY', 'YEARLY', 'LIFETIME'] },
                status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] },
                issuedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time', nullable: true },
                businessId: { type: 'string', format: 'uuid', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'License updated successfully' },
      },
    },
    delete: {
      summary: 'Delete a license',
      tags: ['Licenses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'License deleted successfully' },
      },
    },
  },
};

const logPaths: OAS3Definition['paths'] = {
  '/logs': {
    get: {
      summary: 'List audit logs',
      tags: ['Logs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'search', schema: { type: 'string' } },
        { in: 'query', name: 'level', schema: { type: 'string', enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'] } },
        { in: 'query', name: 'category', schema: { type: 'string' } },
        { in: 'query', name: 'actorId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1 } },
      ],
      responses: {
        200: { description: 'Audit logs returned successfully' },
      },
    },
    delete: {
      summary: 'Clear old audit logs',
      tags: ['Logs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'retentionDays', schema: { type: 'integer', minimum: 1, maximum: 3650 } },
      ],
      responses: {
        200: { description: 'Old logs cleared successfully' },
      },
    },
  },
  '/logs/levels': {
    get: {
      summary: 'List available log levels',
      tags: ['Logs'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Log levels returned successfully' },
      },
    },
  },
  '/logs/categories': {
    get: {
      summary: 'List available log categories',
      tags: ['Logs'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Log categories returned successfully' },
      },
    },
  },
  '/logs/{id}': {
    get: {
      summary: 'Get audit log by ID',
      tags: ['Logs'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Audit log detail returned successfully' },
        404: { description: 'Log entry not found' },
      },
    },
  },
};

const adminPaths: OAS3Definition['paths'] = {
  '/admin/overview': {
    get: {
      summary: 'Get admin overview dashboard',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Admin overview returned successfully' },
      },
    },
  },
};

const adminBusinessPaths: OAS3Definition['paths'] = {
  '/admin/businesses': {
    get: {
      summary: 'List businesses',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Businesses returned successfully' },
      },
    },
    post: {
      summary: 'Create business',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                ownerId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Business created successfully' },
      },
    },
  },
  '/admin/businesses/{businessId}': {
    get: {
      summary: 'Get business by ID',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Business returned successfully' },
        404: { description: 'Business not found' },
      },
    },
    patch: {
      summary: 'Update business',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Business updated successfully' },
      },
    },
    delete: {
      summary: 'Delete business',
      tags: ['Businesses'],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'businessId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        204: { description: 'Business deleted successfully' },
      },
    },
  },
};

const swaggerDefinition: OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: env.APP_NAME,
    description: env.APP_DESCRIPTION,
    version: '1.3.0',
    contact: {
      name: 'API Support',
      url: 'http://www.example.com/support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: 'Development server with API version',
    },
    {
      url: `https://api.${env.APP_NAME.toLowerCase().replace(/\s+/g, '-')}.com/api/v1`,
      description: 'Production server with API version',
    },
  ],
  externalDocs: {
    description: 'Find more info here',
    url: 'http://docs.example.com',
  },
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoint',
    },
    {
      name: 'Auth',
      description: 'Authentication operations',
    },
    {
      name: 'Upload',
      description: 'Operations related to file uploads',
    },
    {
      name: 'Orders',
      description: 'Operations related to guest orders',
    },
    {
      name: 'Users',
      description: 'Operations related to user management',
    },
    {
      name: 'Businesses',
      description: 'Operations related to business management',
    },
    {
      name: 'Licenses',
      description: 'Operations related to license management',
    },
    {
      name: 'Logs',
      description: 'Operations related to audit logs',
    },
    {
      name: 'Admin',
      description: 'Administrative overview endpoints',
    },
  ],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...uploadPaths,
    ...orderPaths,
    ...businessPaths,
    ...userPaths,
    ...licensePaths,
    ...logPaths,
    ...adminPaths,
    ...adminBusinessPaths,
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
      },
    },
  },
};

const swaggerOptions: OAS3Options = {
  definition: swaggerDefinition,
  apis: [],
};

export { swaggerDefinition, swaggerOptions };
