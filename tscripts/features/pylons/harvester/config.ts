import type { RangeSize } from '../../../core/pylon/types'
import { BASE_PYLON_CONFIG, type BasePylonConfig } from '../config'

export interface VanillaCropSpec {
    readonly blockType: string
    readonly growthState: string
    readonly resetOverride?: number
}

export interface HarvesterPylonConfig extends BasePylonConfig {
    readonly headerText: string
    readonly rangeTitle: string
    readonly ranges: readonly RangeSize[]
    readonly rangeRadii: Readonly<Record<RangeSize, number>>
    readonly workDelayTicks: number
    readonly maxHarvestsPerWake: number
    readonly maxBlocksAbove: number
    readonly maxReadyPermutationsPerCrop: number
    readonly lootSampleRolls: number
    readonly minGrowthValues: number
    readonly unbreakingEnchantmentId: string
    readonly vanillaNamespace: string
    readonly enderChestId: string
    readonly harvestSoundId: string
    readonly harvestSoundVolume: number
    readonly harvestSoundPitch: number
    readonly harvestParticleId: string
    readonly growthStateNames: ReadonlySet<string>
    readonly vanillaCrops: readonly VanillaCropSpec[]
}

export const HARVESTER_PYLON_CONFIG: HarvesterPylonConfig = {
    ...BASE_PYLON_CONFIG,
    headerText: 'Work area (in blocks)',
    rangeTitle: 'Work area (in blocks)',
    ranges: ['3x3', '5x5', '7x7', '9x9'],
    rangeRadii: {
        '1x1': 0,
        '3x3': 1,
        '5x5': 2,
        '7x7': 3,
        '9x9': 4,
    },
    workDelayTicks: 20,
    maxHarvestsPerWake: 16,
    maxBlocksAbove: 2,
    maxReadyPermutationsPerCrop: 32,
    lootSampleRolls: 4,
    minGrowthValues: 3,
    unbreakingEnchantmentId: 'minecraft:unbreaking',
    vanillaNamespace: 'minecraft:',
    enderChestId: 'minecraft:ender_chest',
    harvestSoundId: 'dig.grass',
    harvestSoundVolume: 0.8,
    harvestSoundPitch: 1,
    harvestParticleId: 'minecraft:crop_growth_emitter',
    growthStateNames: new Set([
        'growth',
        'age',
        'stage',
        'growth_stage',
        'growth_state',
        'growing_state',
        'crop_age',
        'ripeness',
        'maturity',
    ]),
    vanillaCrops: [
        { blockType: 'minecraft:wheat', growthState: 'growth' },
        { blockType: 'minecraft:carrots', growthState: 'growth' },
        { blockType: 'minecraft:potatoes', growthState: 'growth' },
        { blockType: 'minecraft:beetroot', growthState: 'growth' },
        { blockType: 'minecraft:nether_wart', growthState: 'age' },
        { blockType: 'minecraft:sweet_berry_bush', growthState: 'growth', resetOverride: 1 },
    ],
} as const
