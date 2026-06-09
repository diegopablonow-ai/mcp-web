import { Skeleton } from "@/components/ui/skeleton"

export default function RouteLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
