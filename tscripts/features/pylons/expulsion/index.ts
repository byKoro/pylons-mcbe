import type { PylonKindDefinition } from '../../../core/pylon/types'
import { BLOCK_IDS } from '../../../shared/identifiers'
import { EXPULSION_PYLON_CONFIG } from './config'

export const EXPULSION_PYLON: PylonKindDefinition = {
    id: 'expulsion',
    blockTypeId: BLOCK_IDS.expulsionPylon,
    displayName: 'Pylon Expulsion',
    headerText: EXPULSION_PYLON_CONFIG.headerText,
    slotSpec: { kind: 'filter', count: 9 },
    rangeSpec: {
        kind: 'chunks',
        sizes: EXPULSION_PYLON_CONFIG.ranges,
        hoverTitle: EXPULSION_PYLON_CONFIG.rangeTitle,
    },
    explosionProof: EXPULSION_PYLON_CONFIG.explosionProof,
}

export { clearExpulsionPlayerState, tickExpulsionPlayers } from './expulsionRunner'
export { expulsionWork } from './expulsionWork'
