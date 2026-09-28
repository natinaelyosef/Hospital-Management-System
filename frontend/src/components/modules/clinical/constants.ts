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
<<<<<<< HEAD
  { value: 'registered', label: 'Registered' },
  { value: 'intake_completed', label: 'Intake completed' },
  { value: 'referred', label: 'Referred' },
  { value: 'waiting_for_nurse', label: 'Waiting for triage' },
  { value: 'nurse_assessment_completed', label: 'Nurse assessed' },
  { value: 'waiting_for_doctor', label: 'Waiting for doctor' },
  { value: 'in_consultation', label: 'In consultation' },
  { value: 'lab_requested', label: 'Lab requested' },
  { value: 'lab_in_progress', label: 'Lab in progress' },
  { value: 'lab_completed', label: 'Lab completed' },
  { value: 'prescription_created', label: 'Prescription created' },
  { value: 'pharmacy_processing', label: 'Pharmacy processing' },
  { value: 'payment_required', label: 'Payment required' },
  { value: 'payment_approved', label: 'Payment approved' },
  { value: 'medication_dispensed', label: 'Medication dispensed' },
  { value: 'visit_completed', label: 'Visit completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const VISIT_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
]

export const VISIT_SEVERITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not assessed' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
=======
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
