import type { SelectOption } from '@/components/ui/Select'

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export const GENDER_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All genders' },
  ...GENDER_OPTIONS,
]

export const BLOOD_GROUP_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All blood groups' },
  ...BLOOD_GROUPS.map((group) => ({ value: group, label: group })),
]

export const BLOOD_GROUP_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not known' },
  ...BLOOD_GROUPS.map((group) => ({ value: group, label: group })),
]

export const APPOINTMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'opd', label: 'OPD' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'consultation', label: 'Consultation' },
]

export const APPOINTMENT_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No show' },
]

export const VISIT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'opd', label: 'OPD' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'follow_up', label: 'Follow up' },
]

export const VISIT_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

export const PRESCRIPTION_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const NOTE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'progress', label: 'Progress note' },
  { value: 'nursing', label: 'Nursing note' },
  { value: 'general', label: 'General note' },
]
