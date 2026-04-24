import { Loader } from '@/components/ui/loader'

type AdminListLoaderProps = {
  label?: string
}

export function AdminListLoader({ label = 'Loading...' }: AdminListLoaderProps) {
  return <Loader className="h-48" iconClassName="h-6 w-6" label={label} />
}
