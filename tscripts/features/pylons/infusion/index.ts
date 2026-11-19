import type { PylonKindDefinition } from '../../../core/pylon/types'
import { BLOCK_IDS } from '../../../shared/identifiers'
import { INFUSION_PYLON_CONFIG } from './config'

export const INFUSION_PYLON: PylonKindDefinition = {
    id: 'infusion',
    blockTypeId: BLOCK_IDS.infusionPylon,
    displayName: 'Pylon Infusion',
    headerText: INFUSION_PYLON_CONFIG.headerText,
    slotSpec: { kind: 'filter', count: 9 },
    rangeSpec: { kind: 'none' },
    explosionProof: INFUSION_PYLON_CONFIG.explosionProof,
}

export { tickInfusionOwners } from './infusionOwners'
export { infusionWork } from './infusionWork'
