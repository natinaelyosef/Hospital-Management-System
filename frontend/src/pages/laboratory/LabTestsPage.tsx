import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { labApi } from '@/api/lab.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { LabTestForm } from '@/components/modules/diagnostics/LabTestForm'
import { useClientPagination } from '@/components/modules/diagnostics/useClientPagination'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm, useDebounce } from '@/hooks'
import type { LabTest } from '@/types'
import { formatCurrency } from '@/utils/format'

export default function LabTestsPage() {
  const { hasPermission } = useAuth()
  const canProcess = hasPermission('lab.process')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LabTest | null>(null)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = { per_page: 100, ...(debouncedSearch ? { search: debouncedSearch } : {}) }
  const list = useQuery({ queryKey: ['lab-tests', listQuery], queryFn: () => labApi.tests(listQuery) })

  const rows = useMemo(
    () => (list.data?.data ?? []).filter((test) => !category || test.category === category),
    [list.data, category],
  )
  const { paged, meta, setPage } = useClientPagination(rows)

  const categoryOptions = useMemo(() => {
    const unique = new Set((list.data?.data ?? []).map((test) => test.category))
    return [
      { value: '', label: 'All categories' },
      ...[...unique].sort().map((value) => ({ value, label: value })),
    ]
  }, [list.data])

  const toggleActive = useMutation({
    mutationFn: (test: LabTest) => labApi.updateTest(test.id, { is_active: !test.is_active }),
    onSuccess: (_data, test) => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] })
      toast.success(test.is_active ? 'Test deactivated' : 'Test activated', test.name)
    },
    onError: (error) => toast.error('Unable to update test', getErrorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => labApi.removeTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] })
      toast.success('Test deleted')
    },
    onError: (error) => toast.error('Unable to delete test', getErrorMessage(error)),
  })

  const handleDelete = async (test: LabTest) => {
    const confirmed = await confirm({
      title: `Delete ${test.name}?`,
      message: 'The test is removed from the catalogue. Existing requests keep their recorded results.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    })
    if (confirmed) remove.mutate(test.id)
  }

  const columns: Column<LabTest>[] = [
    { key: 'code', header: 'Code', render: (test) => <span className="font-mono text-xs font-semibold">{test.code}</span> },
    { key: 'name', header: 'Test', render: (test) => <span className="font-medium">{test.name}</span> },
    { key: 'category', header: 'Category', render: (test) => <Badge tone="neutral">{test.category}</Badge> },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (test) => <span className="tabular-nums">{formatCurrency(Number(test.price))}</span>,
    },
    {
      key: 'is_active',
      header: 'Active',
      align: 'center',
      render: (test) => (
        <div className="flex justify-center">
          <Checkbox
            checked={test.is_active}
            disabled={!canProcess || toggleActive.isPending}
            aria-label={`Toggle ${test.name}`}
            onChange={() => toggleActive.mutate(test)}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (test) =>
        canProcess ? (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Edit ${test.name}`}
              onClick={(event) => {
                event.stopPropagation()
                setEditing(test)
                setFormOpen(true)
              }}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={`Delete ${test.name}`}
              onClick={(event) => {
                event.stopPropagation()
                handleDelete(test)
              }}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab tests"
        subtitle="Test catalogue, pricing and availability"
        actions={
          canProcess && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add test
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search code or name…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-52">
          <Select value={category} onChange={(event) => setCategory(event.target.value)} options={categoryOptions} />
        </div>
      </div>

      <Table
        columns={columns}
        data={paged}
        loading={list.isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<FlaskConical size={22} />}
            title="No lab tests found"
            description={debouncedSearch || category ? 'Try adjusting the filters.' : 'Add your first test to the catalogue.'}
          />
        }
      />

      <Pagination meta={meta} onPageChange={setPage} disabled={list.isFetching} />

      <LabTestForm open={formOpen} test={editing} onClose={() => setFormOpen(false)} />
    </div>
  )
}
