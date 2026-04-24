# API

Backend API for the QR-first digital menu MVP+.

## Scope

This API supports:

- Auth for Owner, Staff, and Super Admin
- Business management
- Business user assignment (owner/staff)
- Menu/Category/Item management
- QR settings
- Public menu retrieval by QR/public slug
- Guest order creation without registration
- Staff order status handling
- License key management
- Audit logging

This API does not include checkout processing, tax/accounting systems, reservations, kitchen workflow engines, or structured table management.

## Current Route Groups

- `auth/`
- `businesses/`
- `orders/`
- `licenses/`
- `logs/`
- `users/`
- `admin/`
- `admin/businesses/`

## Docs and Contracts

- Swagger UI is served from `/api-docs`
- API base path is `/api/v1`
- Public order contract uses `businessId`, optional `guestName`, optional `tableLabel`, optional `orderNote`, and `items[]`

## Tech Stack

- Node.js + TypeScript
- Express
- Prisma + PostgreSQL
- Zod validation
- JWT auth

## Local Development

```bash
cd api
npm install
npm run prisma:generate
npm run dev
```
