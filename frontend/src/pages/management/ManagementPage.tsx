import { useMemo } from 'react'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/useToast'
import { useManagementUsersQuery, useUpdateUserRoleMutation } from '@/hooks/useManagementUsers'
import { useAuthStore } from '@/store/authStore'

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

  async function handleRoleChange(userId: number, role: 'admin' | 'user') {
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

      <section className="app-card p-5 border-t-4 border-t-brand-deep">
        <h2 className="app-section-title text-brand-deep">{t('management.users_title')}</h2>
        <p className="text-sm text-neutral-700 mt-1">{t('management.users_desc')}</p>

        {user && (
          <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">{t('management.current_session')}</p>
            <p className="text-sm text-neutral-900 mt-1">{user.full_name}</p>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>
        )}

        {!isAdmin && (
          <div className="mt-4 rounded-xl border border-warning bg-warning-bg p-4">
            <p className="text-sm text-warning-text">{t('management.admin_only')}</p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 rounded-xl border border-neutral-100 overflow-hidden">
            {isLoading ? (
              <p className="p-4 text-sm text-neutral-700">{t('management.loading_users')}</p>
            ) : sortedUsers.length === 0 ? (
              <p className="p-4 text-sm text-neutral-700">{t('management.empty_users')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th className="text-left px-4 py-3">{t('management.col_name')}</th>
                    <th className="text-left px-4 py-3">{t('management.col_email')}</th>
                    <th className="text-left px-4 py-3">{t('management.col_role')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((managedUser) => {
                    const isOwnSession = user?.id === managedUser.id
                    const roleBusy = updateRoleMutation.isPending && updateRoleMutation.variables?.userId === managedUser.id
                    return (
                      <tr key={managedUser.id} className="border-t border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{managedUser.full_name}</td>
                        <td className="px-4 py-3 text-neutral-700">{managedUser.email}</td>
                        <td className="px-4 py-3">
                          <select
                            className="h-9 rounded-lg border border-neutral-100 bg-white px-3 text-sm text-neutral-900"
                            value={managedUser.role}
                            disabled={isOwnSession || roleBusy}
                            onChange={(event) => {
                              const nextRole = event.target.value as 'admin' | 'user'
                              void handleRoleChange(managedUser.id, nextRole)
                            }}
                            aria-label={t('management.change_role_aria', { name: managedUser.full_name })}
                          >
                            <option value="admin">{t('management.role_admin')}</option>
                            <option value="user">{t('management.role_user')}</option>
                          </select>
                          {isOwnSession && (
                            <p className="text-xs text-neutral-400 mt-1">{t('management.current_user_locked')}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  )
}