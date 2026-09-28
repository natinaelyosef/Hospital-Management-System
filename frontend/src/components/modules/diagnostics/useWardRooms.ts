import { useQuery } from '@tanstack/react-query'
import { wardApi } from '@/api/ward.api'
import type { Room, Ward } from '@/types'

/** `GET /wards` embeds `rooms`; the dedicated rooms endpoint is only needed when they are absent. */
export type WardWithRooms = Ward & { rooms?: Room[] }

export interface WardRoomsResult {
  rooms: Room[]
  isLoading: boolean
  isError: boolean
}

export function useWardRooms(ward: Ward | undefined, enabled = true): WardRoomsResult {
  const embedded = (ward as WardWithRooms | undefined)?.rooms
  const wardId = ward?.id ?? 0

  const query = useQuery({
    queryKey: ['ward-rooms', wardId],
    enabled: enabled && wardId > 0 && embedded === undefined,
    queryFn: () => wardApi.rooms(wardId),
  })

  return {
    rooms: embedded ?? query.data ?? [],
    isLoading: embedded === undefined && query.isLoading,
    isError: embedded === undefined && query.isError,
  }
}

export default useWardRooms
