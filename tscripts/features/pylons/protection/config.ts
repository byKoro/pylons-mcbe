import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface ProtectionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
}

export const PROTECTION_PYLON_CONFIG: ProtectionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Add mobs or blocks to protect:',
    rangeTitle: 'Work area (in chunks)',
    ranges: ['1x1', '3x3', '5x5'],
}
