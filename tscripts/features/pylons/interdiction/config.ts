import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface InterdictionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
}

export const INTERDICTION_PYLON_CONFIG: InterdictionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Add mobs to prevent spawns:',
    rangeTitle: 'Work area (in chunks)',
    ranges: ['1x1', '3x3', '5x5'],
}
