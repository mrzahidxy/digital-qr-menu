# Digital Menu SaaS Platform

A QR-first digital menu builder for cafes and businesses.

## Product Scope

This repository targets a lean MVP+ backend and frontend for:

- Owner and Staff authentication
- Super Admin operations
- Business profile and branding
- Menu, Category, and Item CRUD
- Public QR menu page
- Simple guest ordering without registration
- Staff order handling
- Licensing
- Audit logs

## Product Boundaries

This product is explicitly not:

- A POS system
- A payment flow
- A tax engine
- An invoice or accounting system
- A structured table management system
- A kitchen workflow engine
- An advanced analytics warehouse
- A multi-location operations system

## Naming Conventions

Backend and docs should use:

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

Avoid legacy product language in docs and API contracts.

## Repository Structure

- `client/`: Next.js frontend
- `api/`: Node.js + TypeScript backend (Express + Prisma)
- `docs/product-scope.md`: product boundaries and launch scope

## Documentation

- [API README](api/README.md)
- [Product Scope](docs/product-scope.md)
