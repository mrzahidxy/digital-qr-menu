import type { Metadata } from 'next'

import { MenuPage } from '@/features/business'

export const metadata: Metadata = {
  title: 'Menu',
}

export default function BusinessOwnerMenuPage() {
  return <MenuPage />
}
