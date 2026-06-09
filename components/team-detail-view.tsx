"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, UserPlus, Trash2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useTeam } from "@/hooks/useTeams"
import { useAuth } from "@/hooks/useAuth"
import { teamService } from "@/services/teamService"
import type { Role } from "@/lib/types"
import { formatDate, initials, quotaPercent, roleBadge, cn } from "@/lib/helpers"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export function TeamDetailView({ teamId }: { teamId: string }) {
  const { team, isLoading, mutate } = useTeam(teamId)
  const { isAdmin } = useAuth()

  // Invite-flow state
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("member")
  const [submitting, setSubmitting] = useState(false)

  // POST /teams/{teamId}/add-user
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await teamService.addUser(teamId, email, role)
      toast.success(`Invitation sent to ${email}`)
      setEmail("")
      setOpen(false)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(userId: string, label: string) {
    try {
      await teamService.removeUser(teamId, userId)
      toast.success(`Removed ${label} from team`)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Team not found.{" "}
          <Link href="/teams" className="text-primary underline-offset-2 hover:underline">
            Back to teams
          </Link>
        </CardContent>
      </Card>
    )
  }

  const totalUsed = team.members.reduce((s, m) => s + m.aiQuotaUsed, 0)
  const totalLimit = team.members.reduce((s, m) => s + m.aiQuotaLimit, 0)

  // Remove requires admin role; backend endpoint is now defined in spec v1.1.0.
  const canRemove = isAdmin

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All teams
      </Link>

      <PageHeader
        title={team.name}
        description={`${team.members.length} members · created ${formatDate(team.createdAt)}`}
      >
        {isAdmin ? (
          // Fix #1: Use Base UI's render prop pattern correctly.
          // DialogTrigger wraps Base UI's Trigger which expects render as a function,
          // not a JSX element. Passing children directly (without render=) also works
          // because Base UI Trigger renders its children as the trigger element.
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={(props) => (
                <Button {...props}>
                  <UserPlus className="size-4" />
                  Invite member
                </Button>
              )}
            />
            <DialogContent>
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite a team member</DialogTitle>
                  <DialogDescription>
                    {"We'll email an invitation with an onboarding link to join "}
                    {team.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Send invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </PageHeader>

      {/* Aggregate AI quota for the whole team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Team AI quota
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} credits used
            </span>
            <span className="font-medium">{quotaPercent(totalUsed, totalLimit)}%</span>
          </div>
          <Progress value={quotaPercent(totalUsed, totalLimit)} />
        </CardContent>
      </Card>

      {/* Members table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[220px]">AI quota</TableHead>
                {canRemove ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold uppercase text-primary">
                          {initials(m.name ?? m.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", roleBadge(m.role))}>
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.status === "active"
                          ? "border-chart-3/20 bg-chart-3/10 text-chart-3"
                          : "border-chart-4/20 bg-chart-4/10 text-chart-4"
                      }
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {m.aiQuotaUsed} / {m.aiQuotaLimit}
                        </span>
                        <span>{quotaPercent(m.aiQuotaUsed, m.aiQuotaLimit)}%</span>
                      </div>
                      <Progress value={quotaPercent(m.aiQuotaUsed, m.aiQuotaLimit)} className="h-1.5" />
                    </div>
                  </TableCell>
                  {canRemove ? (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(m.id, m.name ?? m.email)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Remove {m.email}</span>
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
