import type { Metadata } from 'next'

import OrderDetailPage from '@/features/business/booking/page'

type OrderPageProps = {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { orderId } = await params

  return {
    title: `Order ${orderId} - Orders`,
  }
}

export default OrderDetailPage
