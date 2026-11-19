import {
    isEffectAllowed,
    POTION_FILTER_CONFIG,
    REQUIRED_EFFECT_TICKS,
    type FilterPayload,
} from '../../filters/index'

export interface InfusionEffect {
    readonly effectTypeId: string
    readonly amplifier: number
}

export const resolveInfusionEffects = (
    payloads: readonly (FilterPayload | undefined)[],
): readonly InfusionEffect[] => {
    const byEffectId = new Map<string, number>()

    for (const payload of payloads) {
        if (payload?.kind !== 'potion') continue
        if (payload.durationTicks < REQUIRED_EFFECT_TICKS) continue
        if (!isEffectAllowed(payload.effectTypeId)) continue

        const cappedAmplifier = Math.min(payload.amplifier, POTION_FILTER_CONFIG.maximumPotency)
        const existing = byEffectId.get(payload.effectTypeId)
        if (existing === undefined || cappedAmplifier > existing) {
            byEffectId.set(payload.effectTypeId, cappedAmplifier)
        }
    }

    const effects: InfusionEffect[] = []
    byEffectId.forEach((amplifier, effectTypeId) => {
        effects.push({ effectTypeId, amplifier })
    })
    return effects
}
