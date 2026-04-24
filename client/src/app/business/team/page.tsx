import type { Metadata } from 'next'

import { TeamPage } from '@/features/business'

export const metadata: Metadata = {
  title: 'Users & Roles',
}

export default function BusinessOwnerTeamPage() {
  return <TeamPage />
}
