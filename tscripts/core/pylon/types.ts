import type { Vector3 } from '@minecraft/server'

export type UiProfile = 'classic' | 'pocket'

export type RangeSize = '1x1' | '3x3' | '5x5' | '7x7' | '9x9'

export type PylonSlotSpec =
    | { readonly kind: 'filter'; readonly count: 9; readonly acceptedItemTag?: undefined }
    | { readonly kind: 'tool'; readonly count: 1; readonly acceptedItemTag: string }

export type PylonRangeSpec =
    | { readonly kind: 'none' }
    | {
          readonly kind: 'blocks' | 'chunks'
          readonly sizes: readonly RangeSize[]
          readonly hoverTitle: string
      }

export interface PylonKindDefinition {
    readonly id: string
    readonly blockTypeId: string
    readonly displayName: string
    readonly headerText: string
    readonly slotSpec: PylonSlotSpec
    readonly rangeSpec: PylonRangeSpec
    readonly explosionProof: boolean
}

export interface PylonLayoutSpec {
    readonly profile: UiProfile
    readonly filterSlots: readonly number[]
    readonly filterSlotSet: ReadonlySet<number>
    readonly toggleButtonSlot: number
    readonly rangeButtonSlot?: number
    readonly panelLeftItemId?: string
    readonly panelRightItemId?: string
    readonly panelLeftSlot?: number
    readonly panelRightSlot?: number
    readonly placeholderItemId: string
}

export interface OpenSession {
    readonly playerId: string
    readonly playerName: string
    readonly profile: UiProfile
    readonly openedTick: number
    initialViewDir?: Vector3
}
