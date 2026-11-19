import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface ExpulsionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
}

export const EXPULSION_PYLON_CONFIG: ExpulsionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    explosionProof: true,
    headerText: 'Add players to whitelist:',
    rangeTitle: 'Work area (in chunks)',
    ranges: ['1x1', '3x3', '5x5'],
}
