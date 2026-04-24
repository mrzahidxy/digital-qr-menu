import type { Route } from 'next'
import { redirect } from 'next/navigation'

export default function AdminRestaurantsPage() {
  redirect('/admin/businesses' as Route)
}
