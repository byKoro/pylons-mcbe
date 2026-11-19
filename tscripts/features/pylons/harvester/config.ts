import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface HarvesterPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
}

export const HARVESTER_PYLON_CONFIG: HarvesterPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Work area (in blocks)',
    rangeTitle: 'Work area (in blocks)',
    ranges: ['3x3', '5x5', '7x7', '9x9'],
}
