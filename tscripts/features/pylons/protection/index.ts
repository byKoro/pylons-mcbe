import type { PylonKindDefinition } from '../../../core/pylon/types'
import { BLOCK_IDS } from '../../../shared/identifiers'
import { PROTECTION_PYLON_CONFIG } from './config'

export const PROTECTION_PYLON: PylonKindDefinition = {
    id: 'protection',
    blockTypeId: BLOCK_IDS.protectionPylon,
    displayName: 'Pylon Protection',
    headerText: PROTECTION_PYLON_CONFIG.headerText,
    slotSpec: { kind: 'filter', count: 9 },
    rangeSpec: {
        kind: 'chunks',
        sizes: PROTECTION_PYLON_CONFIG.ranges,
        hoverTitle: PROTECTION_PYLON_CONFIG.rangeTitle,
    },
    explosionProof: PROTECTION_PYLON_CONFIG.explosionProof,
}
