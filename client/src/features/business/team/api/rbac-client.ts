import { apiClient } from '@/lib/api'

export type BusinessMemberRole = 'OWNER' | 'STAFF'

export type TeamUser = {
  id: string
  email: string
  fullName?: string | null
}

export type TeamMember = {
  id: string
  role: BusinessMemberRole
  createdAt?: string
  user: TeamUser
}

type ApiResponse<T> = {
  message?: string
} & T

type RawTeamMember = {
  id: string
  role: string
  createdAt?: string
  user: {
    id: string
    email: string
    fullName?: string | null
  }
}

const normalizeMemberRole = (role?: string): BusinessMemberRole =>
  role === 'OWNER' ? 'OWNER' : 'STAFF'

const normalizeTeamMember = (member: RawTeamMember): TeamMember => {
  return {
    id: member.id,
    role: normalizeMemberRole(member.role),
    createdAt: member.createdAt,
    user: {
      id: member.user.id,
      email: member.user.email,
      fullName: member.user.fullName ?? null,
    },
  }
}

export async function listBusinessMembers(businessId: string): Promise<TeamMember[]> {
  const response = await apiClient.get<RawTeamMember[]>(`/api/v1/businesses/${businessId}/staff`, {
    auth: true,
    cache: 'no-store',
  })

  return response.map(normalizeTeamMember)
}

export type CreateBusinessInviteUserInput = {
  fullName: string
  email: string
  password: string
  role: BusinessMemberRole
}

export async function createBusinessInviteUser(input: CreateBusinessInviteUserInput): Promise<TeamUser> {
  const response = await apiClient.post<ApiResponse<{ user: TeamUser }>>(
    '/api/v1/users',
    {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      role: input.role,
    },
    {
      auth: true,
    }
  )

  return response.user
}

export type AssignBusinessMemberInput = {
  userId: string
  role: BusinessMemberRole
}

export async function assignBusinessMember(
  businessId: string,
  input: AssignBusinessMemberInput
): Promise<TeamMember> {
  const response = await apiClient.post<ApiResponse<{ assignment: RawTeamMember }>>(
    `/api/v1/businesses/${businessId}/staff`,
    input,
    {
      auth: true,
    }
  )

  return normalizeTeamMember(response.assignment)
}

export async function removeBusinessMember(businessId: string, userId: string): Promise<void> {
  await apiClient.delete(`/api/v1/businesses/${businessId}/staff/${userId}`, {
    auth: true,
  })
}
