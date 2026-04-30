import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  investmentEntitiesApi,
  INVESTMENT_ENTITY_TYPE_OPTIONS,
  type InvestmentEntity,
  type InvestmentEntityType,
} from '@/api/investmentEntities'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { getApiErrorMessage } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import InvestmentEntityCreateModal from './InvestmentEntityCreateModal'
import InvestmentEntityEditModal from './InvestmentEntityEditModal'
import InvestmentEntitiesFiltersCard, { type InvestmentEntitiesFiltersState } from './InvestmentEntitiesFiltersCard'
import InvestmentEntitiesTableCard from './InvestmentEntitiesTableCard'

function buildDefaultInvestmentEntityFilters(): InvestmentEntitiesFiltersState {
  return {
    query: '',
    countryCode: 'all',
    entityType: 'all',
    pageSize: 10,
  }
}

interface InvestmentEntitiesTabProps {
  countryCatalogOptions: Array<{ value: string; label: string }>
}

export default function InvestmentEntitiesTab({ countryCatalogOptions }: InvestmentEntitiesTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [loadingInvestmentEntities, setLoadingInvestmentEntities] = useState(true)
  const [savingInvestmentEntity, setSavingInvestmentEntity] = useState(false)
  const [investmentEntities, setInvestmentEntities] = useState<InvestmentEntity[]>([])
  const [investmentEntityName, setInvestmentEntityName] = useState('')
  const [investmentEntityType, setInvestmentEntityType] = useState<InvestmentEntityType>('broker')
  const [investmentEntityCountryCode, setInvestmentEntityCountryCode] = useState('')
  const [investmentEntityCreateOpen, setInvestmentEntityCreateOpen] = useState(false)
  const [editingInvestmentEntity, setEditingInvestmentEntity] = useState<InvestmentEntity | null>(null)
  const [deletingInvestmentEntity, setDeletingInvestmentEntity] = useState<InvestmentEntity | null>(null)
  const [investmentEntityPage, setInvestmentEntityPage] = useState(1)
  const [investmentEntityFilters, setInvestmentEntityFilters] = useState<InvestmentEntitiesFiltersState>(
    () => buildDefaultInvestmentEntityFilters(),
  )

  useEffect(() => {
    async function loadInvestmentEntities() {
      setLoadingInvestmentEntities(true)
      try {
        const response = await investmentEntitiesApi.list()
        setInvestmentEntities(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, t('admin.entities.toast_load_error')), 'error')
      } finally {
        setLoadingInvestmentEntities(false)
      }
    }

    void loadInvestmentEntities()
  }, [])

  useEffect(() => {
    setInvestmentEntityPage(1)
  }, [investmentEntityFilters.countryCode, investmentEntityFilters.entityType, investmentEntityFilters.pageSize, investmentEntityFilters.query])

  useEffect(() => {
    if (!countryCatalogOptions.length) {
      setInvestmentEntityCountryCode('')
      return
    }
    const selectedStillValid = countryCatalogOptions.some((option) => option.value === investmentEntityCountryCode)
    if (!selectedStillValid) {
      setInvestmentEntityCountryCode(countryCatalogOptions[0].value)
    }
  }, [countryCatalogOptions, investmentEntityCountryCode])

  const investmentEntityCountryOptions = useMemo(() => {
    const values = Array.from(new Set(investmentEntities.map((entity) => entity.country_code))).sort()
    return [{ value: 'all', label: 'Todos' }, ...values.map((value) => ({ value, label: value }))]
  }, [investmentEntities])

  const investmentEntityTypeOptions = useMemo(
    () => [{ value: 'all', label: 'Todos' }, ...INVESTMENT_ENTITY_TYPE_OPTIONS],
    [],
  )

  const investmentEntityTypeLabelByValue = useMemo(
    () => Object.fromEntries(INVESTMENT_ENTITY_TYPE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  )

  const filteredInvestmentEntities = useMemo(() => {
    return [...investmentEntities]
      .filter((entity) => {
        const query = investmentEntityFilters.query.trim().toLowerCase()
        if (query) {
          const haystack = `${entity.name} ${entity.country_code}`.toLowerCase()
          if (!haystack.includes(query)) return false
        }
        if (investmentEntityFilters.countryCode !== 'all' && entity.country_code !== investmentEntityFilters.countryCode) {
          return false
        }
        if (investmentEntityFilters.entityType !== 'all' && entity.entity_type !== investmentEntityFilters.entityType) {
          return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [investmentEntityFilters.countryCode, investmentEntityFilters.entityType, investmentEntityFilters.query, investmentEntities])

  const totalInvestmentEntityPages = Math.max(1, Math.ceil(filteredInvestmentEntities.length / investmentEntityFilters.pageSize))
  const currentInvestmentEntityPage = Math.min(investmentEntityPage, totalInvestmentEntityPages)
  const investmentEntityStartIndex = (currentInvestmentEntityPage - 1) * investmentEntityFilters.pageSize
  const investmentEntityEndIndex = Math.min(
    investmentEntityStartIndex + investmentEntityFilters.pageSize,
    filteredInvestmentEntities.length,
  )
  const paginatedInvestmentEntities = filteredInvestmentEntities.slice(investmentEntityStartIndex, investmentEntityEndIndex)
  const activeInvestmentEntityFilters = [
    investmentEntityFilters.query.trim() ? t('admin.entities.chip_search', { value: investmentEntityFilters.query.trim() }) : null,
    investmentEntityFilters.entityType !== 'all'
      ? t('admin.entities.chip_type', { value: investmentEntityTypeLabelByValue[investmentEntityFilters.entityType] ?? investmentEntityFilters.entityType })
      : null,
    investmentEntityFilters.countryCode !== 'all' ? t('admin.entities.chip_country', { value: investmentEntityFilters.countryCode }) : null,
  ].filter(Boolean) as string[]

  async function handleCreateInvestmentEntity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (investmentEntityName.trim().length < 2) {
      toast(t('admin.entities.toast_name_short'), 'error')
      return
    }
    if (!investmentEntityCountryCode) {
      toast(t('admin.entities.toast_no_country'), 'error')
      return
    }

    setSavingInvestmentEntity(true)
    try {
      const response = await investmentEntitiesApi.create({
        name: investmentEntityName.trim(),
        entity_type: investmentEntityType,
        country_code: investmentEntityCountryCode,
      })
      setInvestmentEntities((current) => [response.data, ...current])
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investmentEntities })
      setInvestmentEntityName('')
      setInvestmentEntityType('broker')
      setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
      setInvestmentEntityCreateOpen(false)
      toast(t('admin.entities.toast_created'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.entities.toast_create_error')), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  async function handleEditInvestmentEntity(
    id: number,
    data: { name: string; entity_type: InvestmentEntityType; country_code: string },
  ) {
    setSavingInvestmentEntity(true)
    try {
      const response = await investmentEntitiesApi.update(id, data)
      setInvestmentEntities((current) => current.map((entity) => (entity.id === id ? response.data : entity)))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investmentEntities })
      setEditingInvestmentEntity(null)
      toast(t('admin.entities.toast_updated'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.entities.toast_update_error')), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  async function handleDeleteInvestmentEntity() {
    if (!deletingInvestmentEntity) return
    setSavingInvestmentEntity(true)
    try {
      await investmentEntitiesApi.delete(deletingInvestmentEntity.id)
      setInvestmentEntities((current) => current.filter((entity) => entity.id !== deletingInvestmentEntity.id))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investmentEntities })
      setDeletingInvestmentEntity(null)
      toast(t('admin.entities.toast_deleted'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('admin.entities.toast_delete_error')), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  return (
    <>
      {investmentEntityCreateOpen && (
        <InvestmentEntityCreateModal
          name={investmentEntityName}
          entityType={investmentEntityType}
          countryCode={investmentEntityCountryCode}
          countryOptions={countryCatalogOptions}
          typeOptions={INVESTMENT_ENTITY_TYPE_OPTIONS}
          setName={setInvestmentEntityName}
          setEntityType={setInvestmentEntityType}
          setCountryCode={setInvestmentEntityCountryCode}
          saving={savingInvestmentEntity}
          onSubmit={handleCreateInvestmentEntity}
          onClose={() => {
            setInvestmentEntityCreateOpen(false)
            setInvestmentEntityName('')
            setInvestmentEntityType('broker')
            setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
          }}
        />
      )}

      {editingInvestmentEntity && (
        <InvestmentEntityEditModal
          entity={editingInvestmentEntity}
          countryOptions={countryCatalogOptions}
          typeOptions={INVESTMENT_ENTITY_TYPE_OPTIONS}
          saving={savingInvestmentEntity}
          onSubmit={handleEditInvestmentEntity}
          onClose={() => setEditingInvestmentEntity(null)}
        />
      )}

      {deletingInvestmentEntity && (
        <ConfirmDeleteModal
          title={t('admin.entities.delete_title')}
          description={t('admin.entities.delete_desc', { name: deletingInvestmentEntity.name })}
          loading={savingInvestmentEntity}
          onConfirm={handleDeleteInvestmentEntity}
          onClose={() => setDeletingInvestmentEntity(null)}
        />
      )}

      <InvestmentEntitiesFiltersCard
        filters={investmentEntityFilters}
        setFilters={setInvestmentEntityFilters}
        activeFilters={activeInvestmentEntityFilters}
        countryOptions={investmentEntityCountryOptions}
        entityTypeOptions={investmentEntityTypeOptions}
        onResetFilters={() => setInvestmentEntityFilters(buildDefaultInvestmentEntityFilters())}
      />

      {loadingInvestmentEntities ? (
        <section className="app-card p-6">
          <LoadingSpinner text={t('admin.entities.loading')} />
        </section>
      ) : (
        <InvestmentEntitiesTableCard
          filteredEntities={filteredInvestmentEntities}
          paginatedEntities={paginatedInvestmentEntities}
          currentPage={currentInvestmentEntityPage}
          totalPages={totalInvestmentEntityPages}
          startIndex={investmentEntityStartIndex}
          endIndex={investmentEntityEndIndex}
          pageSize={investmentEntityFilters.pageSize}
          typeLabelByValue={investmentEntityTypeLabelByValue}
          onPrevPage={() => setInvestmentEntityPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setInvestmentEntityPage((current) => Math.min(totalInvestmentEntityPages, current + 1))}
          onPageSizeChange={(size) => setInvestmentEntityFilters((current) => ({ ...current, pageSize: size }))}
          onEdit={setEditingInvestmentEntity}
          onDelete={setDeletingInvestmentEntity}
        />
      )}

      <FloatingActionMenu
        hidden={false}
        ariaLabel={t('admin.entities.fab_menu_label')}
        items={[
          {
            key: 'create-investment-entity',
            label: t('admin.entities.fab_create'),
            onClick: () => {
              if (!countryCatalogOptions.length) {
                toast(t('admin.entities.toast_no_country_hint'), 'error')
                return
              }
              setInvestmentEntityName('')
              setInvestmentEntityType('broker')
              setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
              setInvestmentEntityCreateOpen(true)
            },
          },
        ]}
      />
    </>
  )
}
