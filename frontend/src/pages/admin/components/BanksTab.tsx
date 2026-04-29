import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { banksApi, type Bank } from '@/api/banks'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import BankCreateModal from './BankCreateModal'
import BankEditModal from './BankEditModal'
import BanksFiltersCard, { type BanksFiltersState } from './BanksFiltersCard'
import BanksTableCard from './BanksTableCard'

function buildDefaultBankFilters(): BanksFiltersState {
  return {
    query: '',
    countryCode: 'all',
    pageSize: 10,
  }
}

interface BanksTabProps {
  countryCatalogOptions: Array<{ value: string; label: string }>
}

export default function BanksTab({ countryCatalogOptions }: BanksTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loadingBanks, setLoadingBanks] = useState(true)
  const [savingBank, setSavingBank] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankName, setBankName] = useState('')
  const [bankCountryCode, setBankCountryCode] = useState('')
  const [bankCreateOpen, setBankCreateOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<Bank | null>(null)
  const [deletingBank, setDeletingBank] = useState<Bank | null>(null)
  const [bankPage, setBankPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BanksFiltersState>(() => buildDefaultBankFilters())

  useEffect(() => {
    async function loadBanks() {
      setLoadingBanks(true)
      try {
        const response = await banksApi.list()
        setBanks(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, t('admin.banks.toast_load_error')), 'error')
      } finally {
        setLoadingBanks(false)
      }
    }

    void loadBanks()
  }, [])

  useEffect(() => {
    setBankPage(1)
  }, [bankFilters.countryCode, bankFilters.pageSize, bankFilters.query])

  useEffect(() => {
    if (!countryCatalogOptions.length) {
      setBankCountryCode('')
      return
    }
    const selectedStillValid = countryCatalogOptions.some((option) => option.value === bankCountryCode)
    if (!selectedStillValid) {
      setBankCountryCode(countryCatalogOptions[0].value)
    }
  }, [countryCatalogOptions, bankCountryCode])

  const countryOptions = useMemo(() => {
    const values = Array.from(new Set(banks.map((bank) => bank.country_code))).sort()
    return [{ value: 'all', label: 'Todos' }, ...values.map((value) => ({ value, label: value }))]
  }, [banks])

  const filteredBanks = useMemo(() => {
    return [...banks]
      .filter((bank) => {
        const query = bankFilters.query.trim().toLowerCase()
        if (query) {
          const haystack = `${bank.name} ${bank.country_code}`.toLowerCase()
          if (!haystack.includes(query)) return false
        }
        if (bankFilters.countryCode !== 'all' && bank.country_code !== bankFilters.countryCode) {
          return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bankFilters.countryCode, bankFilters.query, banks])

  const totalBankPages = Math.max(1, Math.ceil(filteredBanks.length / bankFilters.pageSize))
  const currentBankPage = Math.min(bankPage, totalBankPages)
  const bankStartIndex = (currentBankPage - 1) * bankFilters.pageSize
  const bankEndIndex = Math.min(bankStartIndex + bankFilters.pageSize, filteredBanks.length)
  const paginatedBanks = filteredBanks.slice(bankStartIndex, bankEndIndex)
  const activeBankFilters = [
    bankFilters.query.trim() ? t('admin.banks.chip_search', { value: bankFilters.query.trim() }) : null,
    bankFilters.countryCode !== 'all' ? t('admin.banks.chip_country', { value: bankFilters.countryCode }) : null,
  ].filter(Boolean) as string[]

  async function handleCreateBank(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (bankName.trim().length < 2) {
      toast(t('admin.banks.toast_name_short'), 'error')
      return
    }
    if (!bankCountryCode) {
      toast(t('admin.banks.toast_no_country'), 'error')
      return
    }

    setSavingBank(true)
    try {
      const response = await banksApi.create({ name: bankName.trim(), country_code: bankCountryCode })
      setBanks((current) => [response.data, ...current])
      setBankName('')
      setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
      setBankCreateOpen(false)
      toast(t('admin.banks.toast_created'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.banks.toast_create_error')), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  async function handleEditBank(id: number, name: string, countryCode: string) {
    setSavingBank(true)
    try {
      const response = await banksApi.update(id, { name, country_code: countryCode })
      setBanks((current) => current.map((b) => (b.id === id ? response.data : b)))
      setEditingBank(null)
      toast(t('admin.banks.toast_updated'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.banks.toast_update_error')), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  async function handleDeleteBank() {
    if (!deletingBank) return
    setSavingBank(true)
    try {
      await banksApi.delete(deletingBank.id)
      setBanks((current) => current.filter((b) => b.id !== deletingBank.id))
      setDeletingBank(null)
      toast(t('admin.banks.toast_deleted'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.banks.toast_delete_error')), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <>
      {bankCreateOpen && (
        <BankCreateModal
          name={bankName}
          countryCode={bankCountryCode}
          countryOptions={countryCatalogOptions}
          setName={setBankName}
          setCountryCode={setBankCountryCode}
          saving={savingBank}
          onSubmit={handleCreateBank}
          onClose={() => {
            setBankCreateOpen(false)
            setBankName('')
            setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
          }}
        />
      )}

      {editingBank && (
        <BankEditModal
          bank={editingBank}
          countryOptions={countryCatalogOptions}
          saving={savingBank}
          onSubmit={handleEditBank}
          onClose={() => setEditingBank(null)}
        />
      )}

      {deletingBank && (
        <ConfirmDeleteModal
          title={t('admin.banks.delete_title')}
          description={t('admin.banks.delete_desc', { name: deletingBank.name })}
          loading={savingBank}
          onConfirm={handleDeleteBank}
          onClose={() => setDeletingBank(null)}
        />
      )}

      <BanksFiltersCard
        filters={bankFilters}
        setFilters={setBankFilters}
        activeFilters={activeBankFilters}
        countryOptions={countryOptions}
        onResetFilters={() => setBankFilters(buildDefaultBankFilters())}
      />

      {loadingBanks ? (
        <section className="app-card p-6">
          <LoadingSpinner text={t('admin.banks.loading')} />
        </section>
      ) : (
        <BanksTableCard
          filteredBanks={filteredBanks}
          paginatedBanks={paginatedBanks}
          currentPage={currentBankPage}
          totalPages={totalBankPages}
          startIndex={bankStartIndex}
          endIndex={bankEndIndex}
          pageSize={bankFilters.pageSize}
          onPrevPage={() => setBankPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setBankPage((current) => Math.min(totalBankPages, current + 1))}
          onPageSizeChange={(size) => setBankFilters((current) => ({ ...current, pageSize: size }))}
          onEdit={setEditingBank}
          onDelete={setDeletingBank}
        />
      )}

      <FloatingActionMenu
        hidden={false}
        ariaLabel={t('admin.banks.fab_menu_label')}
        items={[
          {
            key: 'create-bank',
            label: t('admin.banks.fab_create'),
            onClick: () => {
              if (!countryCatalogOptions.length) {
                toast(t('admin.banks.toast_no_country_hint'), 'error')
                return
              }
              setBankName('')
              setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
              setBankCreateOpen(true)
            },
          },
        ]}
      />
    </>
  )
}
