import type { PylonKindDefinition } from '../../../core/pylon/types'
import { BLOCK_IDS, VANILLA_ITEM_TAGS } from '../../../shared/identifiers'
import { HARVESTER_PYLON_CONFIG } from './config'

export const HARVESTER_PYLON: PylonKindDefinition = {
    id: 'harvester',
    blockTypeId: BLOCK_IDS.harvesterPylon,
    displayName: 'Pylon Harvester',
    headerText: HARVESTER_PYLON_CONFIG.headerText,
    slotSpec: { kind: 'tool', count: 1, acceptedItemTag: VANILLA_ITEM_TAGS.hoe },
    rangeSpec: {
        kind: 'blocks',
        sizes: HARVESTER_PYLON_CONFIG.ranges,
        hoverTitle: HARVESTER_PYLON_CONFIG.rangeTitle,
    },
    explosionProof: HARVESTER_PYLON_CONFIG.explosionProof,
}

export { buildHarvesterCrops } from './harvesterCrops'
export { harvesterWork } from './harvesterWork'
