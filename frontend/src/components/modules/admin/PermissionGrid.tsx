import { useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import type { Permission } from '@/types'
import { statusLabel } from '@/utils/format'

export interface PermissionGridProps {
  permissions: Permission[]
  value: string[]
  onChange: (next: string[]) => void
}

export function PermissionGrid({ permissions, value, onChange }: PermissionGridProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const permission of permissions) {
      const list = map.get(permission.group) ?? []
      list.push(permission)
      map.set(permission.group, list)
    }
    return [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  }, [permissions])

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((item) => item !== name) : [...value, name])
  }

  const toggleGroup = (names: string[], checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, ...names])])
    } else {
      onChange(value.filter((item) => !names.includes(item)))
    }
  }

  if (permissions.length === 0) {
    return <p className="text-xs text-muted-foreground">No permissions available for this role type.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(([group, list]) => {
        const names = list.map((permission) => permission.name)
        const selected = names.filter((name) => value.includes(name)).length
        const allSelected = selected === names.length
        return (
          <div key={group} className="rounded-lg border bg-muted/25 p-3">
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b pb-2">
              <Checkbox
                label={statusLabel(group)}
                checked={allSelected}
                disabled={list.length === 0}
                onChange={(event) => toggleGroup(names, event.target.checked)}
              />
              <Badge tone={allSelected ? 'success' : selected > 0 ? 'info' : 'neutral'}>
                {selected}/{list.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {list.map((permission) => (
                <Checkbox
                  key={permission.name}
                  label={permission.label}
                  description={permission.name}
                  checked={value.includes(permission.name)}
                  onChange={() => toggle(permission.name)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PermissionGrid
