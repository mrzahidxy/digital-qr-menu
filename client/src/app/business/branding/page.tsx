import type { Metadata } from 'next'

import { BrandingPage } from '@/features/business'

export const metadata: Metadata = {
  title: 'Branding',
}

export default function BusinessOwnerBrandingPage() {
  return <BrandingPage />
}
