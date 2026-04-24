# Client

The frontend in [client/](./) is the Next.js 15 application for a QR-first cafe digital menu builder with branded public menus and simple guest ordering without registration.

## Product Definition

This app supports one launch scope:

- Public QR menu pages for cafes
- Branded published menus
- Simple guest ordering without registration
- Owner and staff workspace for menu and order operations
- Super Admin interfaces for platform management

This app does not define or market a full restaurant operating system.

## Architecture

The frontend is built with:
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for global state
- **Forms**: React Hook Form with Zod for validation
- **Data Fetching**: TanStack Query for server state management
- **Icons**: Lucide React
- **Charts**: Recharts
- **Authentication**: NextAuth.js with custom session handling

## Features

### Public Menu Experience
- Responsive QR menu display
- Category and item browsing
- Cart functionality
- Guest order submission

### Business Owner Workspace
- Menu management (categories, items)
- Branding configuration
- Order tracking and status updates
- Analytics dashboard
- Staff management

### Admin Console
- User management
- Business licensing
- System monitoring
- Platform analytics

## App Structure

- `src/app/` - Next.js 15 App Router pages
  - `(auth)/` - Authentication pages (login, register)
  - `(public)/menu` - Public menu pages
  - `admin/` - Admin panel pages
  - `business-owner/` - Business owner workspace
  - `api/` - API routes
- `src/components/` - Reusable UI components
  - `charts/` - Chart components for analytics
  - `data-table/` - Table components for data display
  - `layout/` - Layout components
  - `navigation/` - Navigation components
  - `providers/` - Context providers
  - `ui/` - Base UI components (shadcn/ui)
- `src/features/` - Feature-specific components
  - `admin/` - Admin feature components
  - `auth/` - Authentication feature components
  - `business-owner/` - Business owner feature components
  - `public-menu/` - Public menu feature components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Library utilities
- `src/types/` - TypeScript type definitions
- `src/validation/` - Form validation schemas

## In Scope

- Public menu browsing from a QR scan
- Cafe branding, menu publishing, categories, and items
- Guest cart and order submission
- Optional guest name, table label, and order note
- Owner/staff order review and simple status updates
- Admin support screens
- Licensing and privacy-friendly analytics surfaces
- PDF export and offline-capable public menu support where implemented

## Out of Scope

- Payment for guest orders
- POS or checkout workflows
- Accounting or tax engine behavior
- Structured table management and floor maps
- Reservations and delivery flows
- Kitchen display, printer integration, or shift management
- Revenue operations dashboards
- Deep multi-location or restaurant OS workflows

## App Shape

Main user-facing areas:

- Public QR menu: browse published items and submit guest orders
- Business owner workspace: manage menus, branding, and guest orders
- Staff-facing order workflow: view incoming guest orders and update simple status
- Super Admin console: platform administration, licensing, and oversight

## Important Reality In This Repo

- Some frontend modules still use legacy names such as `booking`, `restaurant`, or `business-owner/booking`.
- The old standalone booking validation path has been removed.
- Those names do not change the launch product definition.
- Treat them as internal stability constraints unless a rename is clearly small and low-risk.

## Key Paths

- `src/app/(public)` and `src/features/public-menu/*`: public QR menu experience
- `src/app/business-owner/*`: owner and staff workspace routes
- `src/features/business-owner/orders/*`: current guest order management module (under legacy naming)
- `src/app/admin/*` and `src/features/admin/*`: super admin interfaces
- `src/validation/order-schema.ts`: guest order validation

## Local Development

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure the values used by the client app:

```bash
NEXTAUTH_SECRET=change-me
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Scripts

- `npm run dev` - Start the Next.js dev server
- `npm run build` - Build the production app
- `npm run start` - Run the built app
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run format` - Check code formatting
- `npm run format:write` - Apply code formatting

## Dependencies

Notable dependencies include:
- Next.js 15 with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn/ui for accessible components
- TanStack Query for server state management
- React Hook Form for form handling
- Zod for validation
- Recharts for data visualization
- Lucide React for icons

## Engineering Note

We are building a cafe QR menu product, not a generic booking or restaurant-ops suite.

- Build now: branded menus, QR access, guest orders, simple staff order handling
- Do not expand now: payments, POS, kitchen ops, structured table systems, advanced operations
- Keep legacy internal names only where changing them would create churn
- If broader platform work is needed later, add it deliberately behind new product decisions rather than letting MVP copy drift