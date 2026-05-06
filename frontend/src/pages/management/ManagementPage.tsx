import { useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import EmptyState from '@/components/ui/EmptyState'
import InlineAlert from '@/components/ui/InlineAlert'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import SkeletonTable from '@/components/ui/SkeletonTable'
import { useToast } from '@/hooks/useToast'
import { useManagementUsersQuery, useUpdateUserRoleMutation } from '@/hooks/useManagementUsers'
import { useAuthStore } from '@/store/authStore'
import ManagementFiltersCard, { type ManagementFiltersState } from './components/ManagementFiltersCard'

const ROLE_VALUES = ['admin', 'user'] as const
type UserRole = (typeof ROLE_VALUES)[number]

interface PromoteConfirmationState {
  userId: number
  fullName: string
  email: string
  currentRole: UserRole
  nextRole: 'admin'
}

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
  const [filters, setFilters] = useState<ManagementFiltersState>({
    query: '',
    role: 'all',
  })
  const [promoteConfirmation, setPromoteConfirmation] = useState<PromoteConfirmationState | null>(null)

  const query = filters.query.trim().toLocaleLowerCase()

  const filteredUsers = useMemo(() => {
    return [...users]
      .filter((managedUser) => {
        if (filters.role !== 'all' && managedUser.role !== filters.role) {
          return false
        }

        if (!query) {
          return true
        }

        const searchable = `${managedUser.full_name} ${managedUser.email}`.toLocaleLowerCase()
        return searchable.includes(query)
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [users, filters.role, query])

  const roleOptions = useMemo(
    () => [
      { value: 'admin', label: t('management.role_admin') },
      { value: 'user', label: t('management.role_user') },
    ],
    [t],
  )

  const activeFilters = useMemo(() => {
    const filtersList: string[] = []

    if (filters.query.trim()) {
      filtersList.push(`${t('common.search')}: ${filters.query.trim()}`)
    }

    if (filters.role !== 'all') {
      const selectedRoleLabel = filters.role === 'admin' ? t('management.role_admin') : t('management.role_user')
      filtersList.push(`${t('management.filter_role_label')}: ${selectedRoleLabel}`)
    }

    return filtersList
  }, [filters.query, filters.role, t])

  const hasActiveFilters = activeFilters.length > 0

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

  function handleRoleSelection(
    managedUser: { id: number; full_name: string; email: string; role: UserRole },
    nextRole: UserRole,
  ) {
    if (managedUser.role !== 'admin' && nextRole === 'admin') {
      setPromoteConfirmation({
        userId: managedUser.id,
        fullName: managedUser.full_name,
        email: managedUser.email,
        currentRole: managedUser.role,
        nextRole,
      })
      return
    }

    void handleRoleChange(managedUser.id, nextRole)
  }

  async function handleConfirmPromote() {
    if (!promoteConfirmation) return
    await handleRoleChange(promoteConfirmation.userId, promoteConfirmation.nextRole)
    setPromoteConfirmation(null)
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('management.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('management.subtitle')}</p>
      </div>

      {isAdmin && (
        <ManagementFiltersCard
          filters={filters}
          setFilters={setFilters}
          activeFilters={activeFilters}
          onResetFilters={() => {
            setFilters({ query: '', role: 'all' })
          }}
        />
      )}

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

        {!isAdmin && (
          <div className="p-4">
            <InlineAlert message={t('management.admin_only')} />
          </div>
        )}

        {isAdmin && (
          <div className="p-4 overflow-visible">
            <div className="rounded-xl border border-neutral-100 overflow-visible">
            {isLoading ? (
              <div className="p-2">
                <SkeletonTable rows={6} columns={3} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? t('common.no_results') : t('management.empty_users')}
                description={hasActiveFilters ? t('management.empty_filtered_desc') : t('management.loading_users')}
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
                    {filteredUsers.map((managedUser) => {
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
                                  handleRoleSelection(
                                    {
                                      id: managedUser.id,
                                      full_name: managedUser.full_name,
                                      email: managedUser.email,
                                      role: managedUser.role,
                                    },
                                    nextRole,
                                  )
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
          </div>
        )}
      </section>

      {promoteConfirmation && (
        <Modal
          onClose={() => {
            if (!updateRoleMutation.isPending) {
              setPromoteConfirmation(null)
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
            <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="app-section-title text-brand-text">{t('management.promote_confirm_title')}</h2>
                <p className="mt-0.5 text-sm text-neutral-700">{t('management.promote_confirm_desc')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!updateRoleMutation.isPending) {
                    setPromoteConfirmation(null)
                  }
                }}
                disabled={updateRoleMutation.isPending}
                className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none"
                aria-label={t('common.close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm text-neutral-700">
              <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5">
                <p className="text-xs uppercase tracking-widest text-neutral-400">{t('management.col_name')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{promoteConfirmation.fullName}</p>
              </div>
              <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5">
                <p className="text-xs uppercase tracking-widest text-neutral-400">{t('management.col_email')}</p>
                <p className="mt-1 break-all text-sm font-medium text-neutral-900">{promoteConfirmation.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5">
                  <p className="text-xs uppercase tracking-widest text-neutral-400">{t('management.promote_confirm_current_role')}</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {promoteConfirmation.currentRole === 'admin' ? t('management.role_admin') : t('management.role_user')}
                  </p>
                </div>
                <div className="rounded-xl border border-brand/25 bg-brand-light/50 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-widest text-neutral-400">{t('management.promote_confirm_new_role')}</p>
                  <p className="mt-1 text-sm font-medium text-brand-text">{t('management.role_admin')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning-bg px-3 py-2.5 text-xs text-warning-text">
                {t('management.promote_confirm_warning')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    void handleConfirmPromote()
                  }}
                  disabled={updateRoleMutation.isPending}
                  className="app-btn-primary disabled:pointer-events-none"
                >
                  {updateRoleMutation.isPending ? t('common.loading') : t('management.promote_confirm_action')}
                </button>
                <button
                  type="button"
                  onClick={() => setPromoteConfirmation(null)}
                  disabled={updateRoleMutation.isPending}
                  className="app-btn-secondary disabled:pointer-events-none"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}