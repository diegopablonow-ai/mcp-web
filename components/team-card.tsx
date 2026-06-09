// Server Component — no hooks, pure JSX from props.
import Link from "next/link"
import { Users, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/helpers"
import type { Team } from "@/lib/types"

export function TeamCard({ team }: { team: Team }) {
  const visible = team.members.slice(0, 4)
  const extra = team.members.length - visible.length

  return (
    <Link href={`/teams/${team.id}`} className="group block">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <p className="font-medium leading-tight">{team.name}</p>
                <p className="text-xs text-muted-foreground">
                  {team.members.length} member
                  {team.members.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {team.plan ? <Badge variant="secondary">{team.plan}</Badge> : null}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2">
              {visible.map((m) => (
                <Avatar
                  key={m.id}
                  className="size-7 border-2 border-card"
                  title={m.email}
                >
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold uppercase text-primary">
                    {initials(m.name ?? m.email)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extra > 0 ? (
                <div className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{extra}
                </div>
              ) : null}
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
