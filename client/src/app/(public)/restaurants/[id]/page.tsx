import type { Metadata } from 'next'

import { PLATFORM_BRANDING, RESTAURANT_BRANDING_DEFAULTS } from '@/config/branding'
import { PublicMenuPage as PublicMenuScreen } from '@/features/public-menu'

export const metadata: Metadata = {
  title: PLATFORM_BRANDING.name,
  description: RESTAURANT_BRANDING_DEFAULTS.demoPublicMenuDescription,
}

export default function PublicMenuPage() {
  return <PublicMenuScreen />
}
