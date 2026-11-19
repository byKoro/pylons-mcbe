import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface ExpulsionPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
    readonly workDelayTicks: number
    readonly checkIntervalTicks: number
    readonly messageCooldownTicks: number
    readonly worldSpawnRadiusBlocks: number
    readonly allowedDimensions: readonly string[]
    readonly chunkRadii: Readonly<Partial<Record<RangeSize, number>>>
    readonly fallbackSpawnY: number
    readonly spawnSettleIntervalTicks: number
    readonly spawnSettleMaxAttempts: number
}

export const EXPULSION_PYLON_CONFIG: ExpulsionPylonConfig = {
    ...BASE_PYLON_CONFIG,
    explosionProof: true,
    headerText: 'Add players to whitelist:',
    rangeTitle: 'Work area (in chunks)',
    ranges: ['1x1', '3x3', '5x5'],
    workDelayTicks: 20,
    checkIntervalTicks: 10,
    messageCooldownTicks: 20,
    worldSpawnRadiusBlocks: 1,
    allowedDimensions: ['minecraft:overworld'],
    chunkRadii: {
        '1x1': 0,
        '3x3': 1,
        '5x5': 2,
    },
    fallbackSpawnY: 200,
    spawnSettleIntervalTicks: 2,
    spawnSettleMaxAttempts: 10,
}
