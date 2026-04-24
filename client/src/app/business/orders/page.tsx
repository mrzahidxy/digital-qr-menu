import type { Metadata } from 'next'

import OrdersPage from '@/features/business/OrdersPage'

export const metadata: Metadata = {
  title: 'Orders',
}

export default function BusinessOwnerOrdersPage() {
  return <OrdersPage />
}
