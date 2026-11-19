import { EffectTypes, world, type Player } from '@minecraft/server'
import { APPLIED_DURATION_TICKS, INFUSION_PYLON_CONFIG } from './config'
import { getInfusionIndex } from './infusionIndex'

const OWNER_REFRESH_TICKS = INFUSION_PYLON_CONFIG.refreshTicks

const applyOwnerEffects = (player: Player, effects: ReadonlyMap<string, number>): void => {
    effects.forEach((amplifier, effectTypeId) => {
        if (!EffectTypes.get(effectTypeId)) return
        player.addEffect(effectTypeId, APPLIED_DURATION_TICKS, {
            amplifier,
            showParticles: true,
        })
    })
}

export const tickInfusionOwners = (tick: number): void => {
    if (tick % OWNER_REFRESH_TICKS !== 0) return

    const index = getInfusionIndex()
    if (index.size === 0) return

    const players = world.getAllPlayers()
    if (players.length === 0) return

    const playersById = new Map<string, Player>()
    for (const player of players) {
        if (player.isValid) playersById.set(player.id, player)
    }
    if (playersById.size === 0) return

    const effectsByOwner = new Map<string, Map<string, number>>()
    index.forEach(source => {
        if (!playersById.has(source.ownerId)) return
        let merged = effectsByOwner.get(source.ownerId)
        if (!merged) {
            merged = new Map<string, number>()
            effectsByOwner.set(source.ownerId, merged)
        }
        for (const effect of source.effects) {
            const existing = merged.get(effect.effectTypeId)
            if (existing === undefined || effect.amplifier > existing) {
                merged.set(effect.effectTypeId, effect.amplifier)
            }
        }
    })

    effectsByOwner.forEach((effects, ownerId) => {
        const player = playersById.get(ownerId)
        if (player?.isValid) applyOwnerEffects(player, effects)
    })
}
