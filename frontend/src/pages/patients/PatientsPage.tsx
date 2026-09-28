import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { patientApi } from '@/api/patient.api'
import { PatientFormModal } from '@/components/modules/clinical/PatientFormModal'
import { BLOOD_GROUP_FILTER_OPTIONS, GENDER_FILTER_OPTIONS } from '@/components/modules/clinical/constants'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { Can } from '@/components/auth/Can'
import { useDebounce, usePagination } from '@/hooks'
import type { Patient } from '@/types'
import { formatDate } from '@/utils/format'

const columns: Column<Patient>[] = [
  {
    key: 'patient_number',
    header: 'Patient #',
    render: (patient) => (
      <span className="font-mono text-xs font-semibold text-primary">{patient.patient_number}</span>
    ),
  },
  {
    key: 'full_name',
    header: 'Full name',
    render: (patient) => <span className="font-medium text-foreground">{patient.full_name}</span>,
  },
  {
    key: 'gender',
    header: 'Gender',
    render: (patient) => <span className="capitalize">{patient.gender}</span>,
  },
  { key: 'age', header: 'Age', render: (patient) => `${patient.age} yrs` },
  { key: 'phone', header: 'Phone', hideBelow: 'sm' },
  {
    key: 'blood_group',
    header: 'Blood',
    hideBelow: 'md',
    render: (patient) =>
      patient.blood_group ? <Badge tone="danger">{patient.blood_group}</Badge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'created_at',
    header: 'Registered',
    hideBelow: 'lg',
    render: (patient) => formatDate(patient.created_at),
  },
]

export default function PatientsPage() {
  const navigate = useNavigate()
  const { setPage, resetPage, query } = usePagination()
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 350)

  const params = useMemo(
    () => ({
      ...query,
      search: debouncedSearch.trim() || undefined,
      gender: gender || undefined,
      blood_group: bloodGroup || undefined,
    }),
    [query, debouncedSearch, gender, bloodGroup],
  )

  const { data, isFetching, isLoading } = useQuery({
    queryKey: ['patients', params],
    queryFn: () => patientApi.list(params),
    placeholderData: keepPreviousData,
  })

  const { data: summary } = useQuery({
    queryKey: ['patients', 'summary'],
    queryFn: () => patientApi.summary(),
    staleTime: 60_000,
    retry: 0,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Register, search and manage patient records"
        actions={
          <Can permission="patients.create">
            <Button icon={<UserPlus size={16} />} onClick={() => setRegisterOpen(true)}>
              Register Patient
            </Button>
          </Can>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total patients" value={summary.total} icon={<Users size={18} />} />
          <StatCard label="Male" value={summary.male} icon={<Users size={18} />} tone="default" />
          <StatCard label="Female" value={summary.female} icon={<Users size={18} />} tone="success" />
          <StatCard label="Registered today" value={summary.today} icon={<UserPlus size={18} />} tone="warning" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search by name, patient number or phone…"
          containerClassName="sm:max-w-sm sm:flex-1"
        />
        <div className="flex flex-wrap gap-2.5">
          <Select
            aria-label="Filter by gender"
            value={gender}
            onChange={(event) => {
              setGender(event.target.value)
              resetPage()
            }}
            options={GENDER_FILTER_OPTIONS}
            className="w-40"
          />
          <Select
            aria-label="Filter by blood group"
            value={bloodGroup}
            onChange={(event) => {
              setBloodGroup(event.target.value)
              resetPage()
            }}
            options={BLOOD_GROUP_FILTER_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(patient) => void navigate(`/patients/${patient.id}`)}
        rowKey={(patient) => patient.id}
        empty={
          <EmptyState
            icon={<Users size={22} />}
            title="No patients found"
            description="Adjust the filters or register a new patient to get started."
          />
        }
      />

      {data && (
        <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />
      )}

      <PatientFormModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}
