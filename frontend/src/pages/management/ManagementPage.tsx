import { useMemo } from 'react'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import EmptyState from '@/components/ui/EmptyState'
import InlineAlert from '@/components/ui/InlineAlert'
import Select from '@/components/ui/Select'
import SkeletonTable from '@/components/ui/SkeletonTable'
import { useToast } from '@/hooks/useToast'
import { useManagementUsersQuery, useUpdateUserRoleMutation } from '@/hooks/useManagementUsers'
import { useAuthStore } from '@/store/authStore'

const ROLE_VALUES = ['admin', 'user'] as const
type UserRole = (typeof ROLE_VALUES)[number]

function isUserRole(value: string): value is UserRole {
  return ROLE_VALUES.includes(value as UserRole)
}

export default function ManagementPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'
  const { data: users = [], isLoading } = useManagementUsersQuery(isAdmin)
  const updateRoleMutation = useUpdateUserRoleMutation()

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [users],
  )

  const roleOptions = useMemo(
    () => [
      { value: 'admin', label: t('management.role_admin') },
      { value: 'user', label: t('management.role_user') },
    ],
    [t],
  )

  async function handleRoleChange(userId: number, role: UserRole) {
    try {
      await updateRoleMutation.mutateAsync({ userId, data: { role } })
      toast(t('management.toast_role_updated'), 'success')
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        toast(t('management.toast_forbidden'), 'error')
        return
      }
      toast(t('management.toast_role_update_error'), 'error')
    }
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('management.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('management.subtitle')}</p>
      </div>

      <section className="app-card overflow-visible">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5V4H2v16h5m10 0v-5a3 3 0 10-6 0v5m6 0H11" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-900">{t('management.users_title')}</h2>
              <p className="text-xs text-neutral-400">{t('management.users_desc')}</p>
            </div>
          </div>
        </div>

        {user && (
          <div className="m-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">{t('management.current_session')}</p>
            <p className="mt-1 text-sm text-neutral-900">{user.full_name}</p>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>
        )}

        {!isAdmin && (
          <div className="px-4 pb-4">
            <InlineAlert message={t('management.admin_only')} />
          </div>
        )}

        {isAdmin && (
          <div className="mx-4 mb-4 rounded-xl border border-neutral-100 overflow-visible">
            {isLoading ? (
              <div className="p-2">
                <SkeletonTable rows={6} columns={3} />
              </div>
            ) : sortedUsers.length === 0 ? (
              <EmptyState
                title={t('management.empty_users')}
                description={t('management.loading_users')}
                icon={(
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5V4H2v16h5m10 0v-5a3 3 0 10-6 0v5m6 0H11" />
                  </svg>
                )}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col className="w-[20rem]" />
                    <col className="w-[22rem]" />
                    <col className="w-[14rem]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('management.col_name')}</th>
                      <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('management.col_email')}</th>
                      <th className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('management.col_role')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((managedUser) => {
                      const isOwnSession = user?.id === managedUser.id
                      const roleBusy = updateRoleMutation.isPending && updateRoleMutation.variables?.userId === managedUser.id
                      return (
                        <tr key={managedUser.id} className="group transition-colors hover:bg-brand-light/40 odd:bg-white even:bg-neutral-50/50">
                          <td className="max-w-0 border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                            <span className="block truncate text-sm font-medium text-neutral-900" title={managedUser.full_name}>
                              {managedUser.full_name}
                            </span>
                          </td>
                          <td className="max-w-0 border-b border-r border-neutral-100 px-5 py-3.5 align-middle text-sm text-neutral-700">
                            <span className="block truncate" title={managedUser.email}>{managedUser.email}</span>
                          </td>
                          <td className="border-b border-neutral-100 px-5 py-3.5 align-middle">
                            <div className="w-full max-w-[12rem]">
                              <Select
                                value={managedUser.role}
                                options={roleOptions}
                                disabled={isOwnSession || roleBusy}
                                className="w-full"
                                onChange={(nextRole) => {
                                  if (!isUserRole(nextRole)) return
                                  void handleRoleChange(managedUser.id, nextRole)
                                }}
                              />
                            </div>
                            {isOwnSession && (
                              <p className="mt-1 text-xs text-neutral-400">{t('management.current_user_locked')}</p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}