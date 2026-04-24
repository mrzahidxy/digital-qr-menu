import type { Route } from 'next'
import { redirect } from 'next/navigation'

export default function AdminRestaurantsRedirectPage() {
  redirect('/admin/businesses' as Route)
}
