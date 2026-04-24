'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, ShieldCheck, Users2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/features/admin/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/features/admin/components/ui/sheet'
import { getErrorMessage } from '@/lib/errors'

import {
  assignBusinessMember,
  createBusinessInviteUser,
  listBusinessMembers,
  removeBusinessMember,
  teamKeys,
  type BusinessMemberRole,
  type TeamMember,
} from './api'

type DialogMode = 'create' | 'edit'

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>

const teamMemberSchema = z.object({
  fullName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  password: z.string().optional(),
  userId: z.string().trim().optional(),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
})

const ROLE_OPTIONS: Array<{ role: BusinessMemberRole; label: string }> = [
  {
    role: 'OWNER',
    label: 'Owner',
  },
  {
    role: 'STAFF',
    label: 'Staff',
  },
]

function toTitleCase(value: string) {
  if (!value.trim()) return ''

  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getMemberName(member: TeamMember) {
  if (member.user?.fullName && member.user.fullName.trim().length > 0) {
    return member.user.fullName
  }

  const [local] = (member.user?.email ?? '').split('@')
  return toTitleCase(local || 'User')
}

function normalizeRole(role?: string): BusinessMemberRole {
  return role === 'OWNER' ? 'OWNER' : 'STAFF'
}

export function UsersAndRolesPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const businessId = session?.user?.businessId ?? null
  const currentUserId = session?.user?.id ?? null
  const currentRole = session?.user?.role ?? 'GUEST'
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'
  const isOwner = currentRole === 'OWNER'
  const canManageUsers = isSuperAdmin || isOwner
  const canInviteWithCredentials = isSuperAdmin

  const [search, setSearch] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  const membersQuery = useQuery({
    queryKey: teamKeys.members(businessId ?? ''),
    queryFn: () => listBusinessMembers(businessId ?? ''),
    enabled: Boolean(businessId),
    staleTime: 60_000,
  })

  const createMemberMutation = useMutation({
    mutationFn: async (values: TeamMemberFormValues) => {
      if (!businessId) {
        throw new Error('Business ID is missing in session')
      }

      const role = normalizeRole(values.role)

      if (canInviteWithCredentials) {
        const fullName = values.fullName?.trim() ?? ''
        const email = values.email?.trim() ?? ''
        const password = values.password ?? ''

        if (!fullName) {
          throw new Error('Name is required')
        }

        if (!z.string().email().safeParse(email).success) {
          throw new Error('A valid email is required')
        }

        if (!password || password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }

        const user = await createBusinessInviteUser({
          fullName,
          email,
          password,
          role,
        })

        await assignBusinessMember(businessId, {
          userId: user.id,
          role,
        })

        return
      }

      const userId = values.userId?.trim() ?? ''
      if (!userId) {
        throw new Error('User ID is required to assign an existing account')
      }

      await assignBusinessMember(businessId, {
        userId,
        role,
      })
    },
    onSuccess: () => {
      toast.success('Team member added')
      void queryClient.invalidateQueries({ queryKey: teamKeys.members(businessId ?? '') })
      closeSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to add team member'))
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: BusinessMemberRole }) => {
      if (!businessId) {
        throw new Error('Business ID is missing in session')
      }

      await assignBusinessMember(businessId, {
        userId,
        role,
      })
    },
    onSuccess: () => {
      toast.success('Member role updated')
      void queryClient.invalidateQueries({ queryKey: teamKeys.members(businessId ?? '') })
      closeSheet()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update role'))
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!businessId) {
        throw new Error('Business ID is missing in session')
      }

      await removeBusinessMember(businessId, userId)
    },
    onSuccess: () => {
      toast.success('Member removed')
      void queryClient.invalidateQueries({ queryKey: teamKeys.members(businessId ?? '') })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to remove member'))
    },
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return members

    return members.filter((member) => {
      const name = getMemberName(member).toLowerCase()
      const email = member.user?.email?.toLowerCase() ?? ''
      const role = member.role?.toLowerCase() ?? ''
      return (
        name.includes(term) ||
        email.includes(term) ||
        role.includes(term)
      )
    })
  }, [members, search])

  const ownerCount = members.filter((member) => member.role === 'OWNER').length
  const staffCount = members.filter((member) => member.role === 'STAFF').length

  const openCreate = () => {
    setDialogMode('create')
    setSelectedMember(null)
    setIsSheetOpen(true)
  }

  const openEdit = (member: TeamMember) => {
    setDialogMode('edit')
    setSelectedMember(member)
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    setIsSheetOpen(false)
    setSelectedMember(null)
  }

  const handleSubmit = async (values: TeamMemberFormValues) => {
    if (!canManageUsers) {
      toast.error('You do not have permission to manage business members')
      return
    }

    if (dialogMode === 'create') {
      await createMemberMutation.mutateAsync(values)
      return
    }

    if (!selectedMember) {
      return
    }

    const nextRole = normalizeRole(values.role)
    if (nextRole === selectedMember.role) {
      closeSheet()
      return
    }

    await updateMemberMutation.mutateAsync({
      userId: selectedMember.user.id,
      role: nextRole,
    })
  }

  if (!businessId) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Users &amp; Roles</CardTitle>
          <CardDescription>
            This account is not linked to a business. Business membership management is unavailable.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Business Team</p>
          <h1 className="text-2xl font-semibold text-slate-900">Users &amp; Roles</h1>
          <p className="text-sm text-slate-500">
            Manage business membership roles using business staff endpoints.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!canManageUsers}>
          <Plus className="h-4 w-4" />
          {canInviteWithCredentials ? 'Create member' : 'Assign member'}
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Team members"
          value={members.length}
          helper="From business membership records"
          icon={<Users2 className="h-5 w-5" />}
        />
        <StatTile
          label="Owners"
          value={ownerCount}
          helper="OWNER memberships"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatTile label="Staff" value={staffCount} helper="STAFF memberships" />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle>Team directory</CardTitle>
            <CardDescription>Business membership list with simplified role presets</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="w-64"
          />
        </CardHeader>

        <CardContent className="px-6 py-4">
          {membersQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading members...
            </div>
          ) : membersQuery.error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-slate-500">
                Unable to load team members. Check permissions and try again.
              </p>
              <Button variant="outline" onClick={() => void membersQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-auto">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Business role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={3}>
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="border-t text-sm text-slate-700">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{getMemberName(member)}</p>
                            <p className="text-xs text-slate-500">{member.user?.email ?? 'No email'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{toTitleCase(member.role)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(member)}
                              disabled={
                                !canManageUsers ||
                                (!isSuperAdmin && member.role === 'OWNER')
                              }
                            >
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!member.user?.id) return
                                removeMemberMutation.mutate(member.user.id)
                              }}
                              disabled={
                                !canManageUsers ||
                                removeMemberMutation.isPending ||
                                member.user?.id === currentUserId
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!canManageUsers ? (
            <p className="mt-3 text-xs text-amber-600">
              You need owner-level access to manage business members.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <MemberSheet
        open={isSheetOpen}
        mode={dialogMode}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) {
            setSelectedMember(null)
          }
        }}
        member={selectedMember}
        onSubmit={handleSubmit}
        isSubmitting={
          createMemberMutation.isPending ||
          updateMemberMutation.isPending ||
          removeMemberMutation.isPending
        }
        allowCredentialInvite={canInviteWithCredentials}
        currentRole={currentRole}
      />
    </div>
  )
}

type StatTileProps = {
  label: string
  value: number
  helper?: string
  icon?: ReactNode
}

function StatTile({ label, value, helper, icon }: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        {icon ?? <ShieldCheck className="h-4 w-4" />}
      </div>
      <div className="space-y-0.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-900">{value}</div>
        {helper ? <div className="text-xs text-slate-500">{helper}</div> : null}
      </div>
    </div>
  )
}

type MemberSheetProps = {
  open: boolean
  mode: DialogMode
  onOpenChange: (open: boolean) => void
  member: TeamMember | null
  onSubmit: (values: TeamMemberFormValues) => Promise<void>
  isSubmitting: boolean
  allowCredentialInvite: boolean
  currentRole: string
}

function MemberSheet({
  open,
  mode,
  onOpenChange,
  member,
  onSubmit,
  isSubmitting,
  allowCredentialInvite,
  currentRole,
}: MemberSheetProps) {
  const roleOptions = useMemo(
    () =>
      currentRole === 'OWNER'
        ? ROLE_OPTIONS.filter((preset) => preset.role === 'STAFF')
        : ROLE_OPTIONS,
    [currentRole]
  )

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      userId: '',
      role: member?.role ?? 'STAFF',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        fullName: '',
        email: '',
        password: '',
        userId: '',
        role: 'STAFF',
      })
      return
    }

    if (member) {
      form.reset({
        fullName: member.user.fullName ?? '',
        email: member.user.email,
        password: '',
        userId: member.user.id,
        role: member.role,
      })
    }
  }, [form, member, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>
            {mode === 'create'
              ? allowCredentialInvite
                ? 'Create member'
                : 'Assign member'
              : 'Edit member role'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? allowCredentialInvite
                ? 'Create a user account and assign it to this business.'
                : 'Assign an existing user to this business.'
              : 'Update business membership role.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="flex-1 space-y-4 p-4">
            {mode === 'create' && allowCredentialInvite ? (
              <>
                <FormField label="Name" error={form.formState.errors.fullName?.message}>
                  <Input placeholder="Jordan Lee" {...form.register('fullName')} />
                </FormField>

                <FormField label="Email" error={form.formState.errors.email?.message}>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    autoComplete="email"
                    {...form.register('email')}
                  />
                </FormField>

                <FormField label="Password" error={form.formState.errors.password?.message}>
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    {...form.register('password')}
                  />
                </FormField>
              </>
            ) : mode === 'create' ? (
              <FormField
                label="Existing user ID"
                error={form.formState.errors.userId?.message}
              >
                <Input
                  placeholder="UUID of an existing user"
                  autoComplete="off"
                  {...form.register('userId')}
                />
                <p className="text-xs text-slate-500">
                  Assign an existing user account by ID.
                </p>
              </FormField>
            ) : (
              <>
                <FormField label="Member">
                  <Input value={member?.user.fullName ?? ''} readOnly />
                </FormField>
                <FormField label="Email">
                  <Input value={member?.user.email ?? ''} readOnly />
                </FormField>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Role preset
              </label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) => form.setValue('role', normalizeRole(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.role} value={option.role}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="border-t ">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : mode === 'create' ? (
                allowCredentialInvite ? 'Create member' : 'Assign member'
              ) : (
                'Save role'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

type FormFieldProps = {
  label: string
  children: ReactNode
  error?: string
}

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}
