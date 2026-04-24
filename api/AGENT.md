# API Agent Guide

## Product Definition

The backend supports a QR-first cafe digital menu builder with branded public menus and simple guest ordering without registration.

## Scope Boundaries

Build now:

- Auth and RBAC
- Public menu delivery
- Guest order submission
- Simple order status updates
- Workspace configuration for menu, branding, and QR behavior
- Licensing, privacy-friendly analytics, and admin support

Do not expand now:

- Guest checkout processing
- Tax and invoicing systems
- Reservations
- Structured table management
- Kitchen display or printer workflows
- Multi-location operations suites

## Responsibilities

- Own backend work in `api/` only
- Keep layering strict: `routes -> controllers -> services -> utils/prisma`
- Preserve stable request/response behavior unless a change is explicitly requested
- Keep product-facing docs and examples aligned to the cafe QR menu launch scope

## Naming and Language

Use these terms in code and docs whenever possible:

- Business
- Menu
- Category
- Item
- Guest Order
- Order Item
- Owner
- Staff
- Super Admin
- Table Label

Avoid deprecated domain wording in launch-facing guidance.

## Working Rules

- Identify the target route in `src/routes/*`
- Keep controllers thin
- Put business logic in `src/services/*`
- Validate at the route boundary with Zod
- Preserve role and tenant/business boundaries

## Change Safety

- Small, targeted diffs
- No silent contract changes
- No unnecessary migrations
- No frontend edits from this guide’s scope

## Validation

- `npm run build`
- Run focused endpoint checks when relevant
- Call out skipped verification explicitly

## Engineering Note

Keep MVP backend work centered on menu publishing and simple guest orders.
