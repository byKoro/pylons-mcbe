import type { FilterPayload } from '../../filters/index'

export const resolveExpulsionWhitelist = (payloads: readonly (FilterPayload | undefined)[]): readonly string[] => {
    const allowedSet = new Set<string>()
    for (const payload of payloads) {
        if (payload?.kind === 'player' && payload.playerId.length > 0) {
            allowedSet.add(payload.playerId)
        }
    }
    return Array.from(allowedSet).sort()
}
