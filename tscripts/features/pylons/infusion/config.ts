import { TICKS_PER_SECOND } from '../../filters/index'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface InfusionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly appliedDurationSeconds: number
    readonly refreshTicks: number
}

export const INFUSION_PYLON_CONFIG: InfusionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Active potion effects:',
    appliedDurationSeconds: 20,
    refreshTicks: 60,
}

export const APPLIED_DURATION_TICKS: number =
    INFUSION_PYLON_CONFIG.appliedDurationSeconds * TICKS_PER_SECOND
