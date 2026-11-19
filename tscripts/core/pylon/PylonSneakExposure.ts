import { world, type Entity, type Player } from '@minecraft/server'
import { ENTITY_EVENT_IDS, ENTITY_IDS } from '../../shared/identifiers'
import { safeGetBlock } from '../../shared/world'
import { SNEAK_WATCHER_INTERVAL_TICKS } from '../scheduler/Cadence'
import { pylonKindRegistry } from './PylonKindRegistry'
import { findPylonEntityAt, setPylonFakeSelection } from './PylonLifecycle'

const MAX_RAYCAST_DISTANCE = 6 as const
const sneakExposed = new Map<string, Entity>()

const resolveLookedAtPylonEntity = (player: Player): Entity | undefined => {
    const hitEntity = player.getEntitiesFromViewDirection({
        maxDistance: MAX_RAYCAST_DISTANCE,
        type: ENTITY_IDS.pylonContainer,
    })[0]?.entity
    if (hitEntity?.isValid) return hitEntity

    const hitBlock = player.getBlockFromViewDirection({ maxDistance: MAX_RAYCAST_DISTANCE })?.block
    if (!hitBlock || !pylonKindRegistry.has(hitBlock.typeId)) return undefined
    return findPylonEntityAt(hitBlock.dimension, hitBlock.location)
}

export const updateSneakCollisionWatcher = (tick: number): void => {
    if (tick % SNEAK_WATCHER_INTERVAL_TICKS !== 0) return

    let desired: Map<string, Entity> | undefined

    for (const player of world.getAllPlayers()) {
        if (!player.isSneaking) continue
        const target = resolveLookedAtPylonEntity(player)
        if (!target?.isValid) continue
        desired ??= new Map<string, Entity>()
        desired.set(target.id, target)
    }

    if (!desired && sneakExposed.size === 0) return

    sneakExposed.forEach((entity, id) => {
        if (desired?.has(id)) return
        sneakExposed.delete(id)
        if (!entity.isValid) return
        entity.triggerEvent(ENTITY_EVENT_IDS.addCollision)
        const block = safeGetBlock(entity.dimension, entity.location)
        if (block) setPylonFakeSelection(block, true)
    })

    desired?.forEach((entity, id) => {
        if (sneakExposed.has(id)) return
        sneakExposed.set(id, entity)
        entity.triggerEvent(ENTITY_EVENT_IDS.removeCollision)
        const block = safeGetBlock(entity.dimension, entity.location)
        if (block) setPylonFakeSelection(block, false)
    })
}

export const handlePylonEntityHitHint = (player: Player, target: Entity): void => {
    if (target.typeId !== ENTITY_IDS.pylonContainer) return
    player.onScreenDisplay.setActionBar('§7Sneak while mining to break this pylon')
}
