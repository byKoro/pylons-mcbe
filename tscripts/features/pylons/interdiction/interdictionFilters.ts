import type { FilterPayload } from '../../filters/index'

export interface InterdictionTargets {
    readonly lifeless: boolean
    readonly mobIds: readonly string[]
}

export const resolveInterdictionTargets = (payloads: readonly (FilterPayload | undefined)[]): InterdictionTargets => {
    const mobSet = new Set<string>()

    for (const payload of payloads) {
        if (!payload) continue
        if (payload.kind === 'lifeless') {
            return { lifeless: true, mobIds: [] }
        }
        if (payload.kind === 'mob' && payload.entityTypeId.length > 0) {
            mobSet.add(payload.entityTypeId)
        }
    }

    return {
        lifeless: false,
        mobIds: Array.from(mobSet).sort(),
    }
}
