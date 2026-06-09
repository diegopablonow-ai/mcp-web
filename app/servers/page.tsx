// Server Component — runs on the server, so "use cache" is meaningful here.
// fetchServers() is a cached async function; the result is served from the
// Next.js cache across navigations and revalidated when
// revalidateTag("servers", "max") is called (e.g. after a deploy or status
// change mutation in an action or API route).
import { fetchServers } from "@/services/serverService"
import { ServersView } from "@/components/servers-view"

export default async function ServersPage() {
  // Pre-fetch on the server. ServersView is a client component that uses
  // SWR with the same cache key ("/servers"), so this data seeds the SWR
  // cache on first render — eliminating the client-side loading state on
  // initial navigation.
  const initialServers = await fetchServers()
  return <ServersView initialServers={initialServers} />
}
