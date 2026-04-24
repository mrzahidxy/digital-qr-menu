# Client Agent Guide

## Product Definition

The frontend is for a QR-first cafe digital menu builder with branded public menus and simple guest ordering without registration.

## Scope Boundaries

Build now:

- Public QR menu browsing
- Published menu branding and presentation
- Guest cart and order submission
- Optional guest name, table label, and note
- Owner/staff order review and simple status updates
- Super Admin interfaces that support launch operations

Do not expand now:

- Payment for guest orders
- POS or checkout flows
- Reservations
- Structured table management
- Kitchen display or printer workflows
- Advanced restaurant operations dashboards

## Responsibilities

- Own frontend work in `client/` only
- Preserve route behavior and API contract assumptions
- Keep product-facing copy aligned to the cafe QR menu launch scope
- Prefer minimal edits over broad refactors

## Legacy Naming To Treat Carefully

Legacy internal/frontend names still exist, including:

- `business-owner/booking`
- `restaurant` naming in some admin and public-menu flows

Rules:

- Do not do a risky repo-wide rename in normal feature work
- Prefer updating visible labels and docs first
- Only rename internals when the change is clearly small, safe, and well-contained

## Working Rules

- Keep domain logic in `src/features/*`
- Keep routes in `src/app/*`
- Reuse shared UI primitives from `src/components/*`
- Maintain auth/session behavior and role guards
- Keep the guest ordering flow simple

## Product Language

Prefer:

- Cafe
- Business
- Menu
- Guest Order
- QR Menu
- Owner
- Staff
- Super Admin
- Table Label

Avoid in new product-facing copy when a simpler launch term is more accurate:

- booking / bookings
- organizer
- event
- reservation
- POS
- checkout
- kitchen ops
- operations suite

## Change Safety

- Minimal, focused diffs
- No unrequested design-system rewrites
- No backend edits from this guide’s scope
- No breaking API assumptions

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Manual smoke check on touched menu/order/admin screens when possible

## Engineering Note

This codebase can grow later, but MVP work should stay disciplined. Add future expansion only when explicitly requested, and avoid letting broader restaurant-ops ideas leak into routine UI copy or navigation.
