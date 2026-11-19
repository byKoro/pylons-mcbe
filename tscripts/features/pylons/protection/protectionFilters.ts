import type { FilterPayload } from '../../filters/index'

export interface ProtectionTargets {
    readonly blockIds: readonly string[]
    readonly mobIds: readonly string[]
}

export const resolveProtectionTargets = (payloads: readonly (FilterPayload | undefined)[]): ProtectionTargets => {
    const blockSet = new Set<string>()
    const mobSet = new Set<string>()

    for (const payload of payloads) {
        if (!payload) continue
        if (payload.kind === 'block' && payload.blockTypeId.length > 0) {
            blockSet.add(payload.blockTypeId)
            continue
        }
        if (payload.kind === 'mob' && payload.entityTypeId.length > 0) {
            mobSet.add(payload.entityTypeId)
        }
    }

    return {
        blockIds: Array.from(blockSet).sort(),
        mobIds: Array.from(mobSet).sort(),
    }
}
