import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface ProtectionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
    readonly workDelayTicks: number
    readonly chunkRadii: Readonly<Record<string, number>>
    readonly feedbackCooldownTicks: number
    readonly feedbackParticleId: string
    readonly blockProtectedMessage: string
    readonly mobProtectedMessage: string
}

export const PROTECTION_PYLON_CONFIG: ProtectionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Add mobs or blocks to protect:',
    rangeTitle: 'Work area (in chunks)',
    ranges: ['1x1', '3x3', '5x5'],
    workDelayTicks: 20,
    chunkRadii: {
        '1x1': 0,
        '3x3': 1,
        '5x5': 2,
    },
    feedbackCooldownTicks: 20,
    feedbackParticleId: 'minecraft:basic_flame_particle',
    blockProtectedMessage: '§eProtected by Protection Pylon',
    mobProtectedMessage: '§eProtected by Protection Pylon',
} as const
