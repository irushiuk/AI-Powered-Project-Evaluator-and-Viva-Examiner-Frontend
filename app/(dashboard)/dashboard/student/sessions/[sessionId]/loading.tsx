import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-40 bg-gray-200" />
        <Skeleton className="h-4 w-64 bg-gray-200" />
      </div>

      <Skeleton className="h-36 w-full rounded-xl bg-gray-200" />

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-xl bg-gray-200" />
        <Skeleton className="h-28 w-full rounded-xl bg-gray-200" />
      </div>

      <Skeleton className="h-96 w-full rounded-xl bg-gray-200" />
    </div>
  )
}
