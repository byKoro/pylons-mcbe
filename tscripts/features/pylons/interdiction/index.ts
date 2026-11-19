import type { PylonKindDefinition } from '../../../core/pylon/types'
import { BLOCK_IDS } from '../../../shared/identifiers'
import { INTERDICTION_PYLON_CONFIG } from './config'

export const INTERDICTION_PYLON: PylonKindDefinition = {
    id: 'interdiction',
    blockTypeId: BLOCK_IDS.interdictionPylon,
    displayName: 'Pylon Interdiction',
    headerText: INTERDICTION_PYLON_CONFIG.headerText,
    slotSpec: { kind: 'filter', count: 9 },
    rangeSpec: {
        kind: 'chunks',
        sizes: INTERDICTION_PYLON_CONFIG.ranges,
        hoverTitle: INTERDICTION_PYLON_CONFIG.rangeTitle,
    },
    explosionProof: INTERDICTION_PYLON_CONFIG.explosionProof,
}
