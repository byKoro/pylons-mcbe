import {
    Player,
    system,
    type Dimension,
    type EntityHurtBeforeEvent,
    type PlayerBreakBlockBeforeEvent,
    type Vector3,
} from '@minecraft/server'
import { PROTECTION_PYLON_CONFIG } from './config'
import { isBlockProtected, isMobProtected } from './protectionIndex'

const lastFeedbackTickByPlayer = new Map<string, number>()

export const clearProtectionPlayerState = (playerId: string): void => {
    lastFeedbackTickByPlayer.delete(playerId)
}

const sendProtectionFeedback = (
    player: Player,
    dimension: Dimension,
    particleLocation: Vector3,
    message: string,
): void => {
    if (!player.isValid) return
    const now = system.currentTick
    const last = lastFeedbackTickByPlayer.get(player.id)
    if (last !== undefined && now - last < PROTECTION_PYLON_CONFIG.feedbackCooldownTicks) return
    lastFeedbackTickByPlayer.set(player.id, now)
    player.onScreenDisplay.setActionBar(message)
    try {
        dimension.spawnParticle(PROTECTION_PYLON_CONFIG.feedbackParticleId, particleLocation)
    } catch {
        return
    }
}

export const handleBeforeBreakProtectedBlock = (event: PlayerBreakBlockBeforeEvent): void => {
    if (event.cancel) return
    const { block, dimension, player } = event
    const blockLocation = block.location
    const blockTypeId = block.typeId
    if (!isBlockProtected(dimension.id, blockLocation, player.id, blockTypeId)) return
    event.cancel = true
    const particleLocation = {
        x: blockLocation.x + 0.5,
        y: blockLocation.y + 0.5,
        z: blockLocation.z + 0.5,
    }
    system.run(() =>
        sendProtectionFeedback(player, dimension, particleLocation, PROTECTION_PYLON_CONFIG.blockProtectedMessage),
    )
}

export const handleBeforeHurtProtectedMob = (event: EntityHurtBeforeEvent): void => {
    if (event.cancel) return
    const attacker = event.damageSource.damagingEntity
    if (!(attacker instanceof Player)) return
    const { hurtEntity } = event
    const { dimension, location, typeId } = hurtEntity
    if (!isMobProtected(dimension.id, location, attacker.id, typeId)) return
    event.cancel = true
    const particleLocation = {
        x: location.x,
        y: location.y + 1,
        z: location.z,
    }
    system.run(() =>
        sendProtectionFeedback(attacker, dimension, particleLocation, PROTECTION_PYLON_CONFIG.mobProtectedMessage),
    )
}
