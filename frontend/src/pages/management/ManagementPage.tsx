import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'

export default function ManagementPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()

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
      </section>
    </div>
  )
}