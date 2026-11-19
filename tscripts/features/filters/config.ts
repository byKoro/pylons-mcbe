import type { PotionFilterConfig } from './types'

export const TICKS_PER_SECOND = 20 as const

export const POTION_FILTER_CONFIG: PotionFilterConfig = {
    minimumDurationSeconds: 60,
    requiredDurationSeconds: 3600,
    maximumPotency: 3,
    allowedEffects: [],
    deniedEffects: [],
}

export const MINIMUM_EFFECT_TICKS: number =
    POTION_FILTER_CONFIG.minimumDurationSeconds * TICKS_PER_SECOND

export const REQUIRED_EFFECT_TICKS: number =
    POTION_FILTER_CONFIG.requiredDurationSeconds * TICKS_PER_SECOND
