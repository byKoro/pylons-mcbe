import { Player, world, type Entity } from '@minecraft/server'
import { readPlayerUiProfile } from '../../core/pylon/PylonInteractions'
import { pylonKindRegistry } from '../../core/pylon/PylonKindRegistry'
import {
    countOccupiedSlots,
    readPylonOwner,
    readPylonProfile,
    readPylonRange,
    readPylonWorking,
} from '../../core/pylon/PylonLayout'
import { findPylonEntityAt, resolvePylonDefinition } from '../../core/pylon/PylonLifecycle'
import { pylonSessions } from '../../core/pylon/PylonSessions'
import { entityManager } from '../../core/runtime/EntityManager'
import { DYNAMIC_PROPERTY_IDS, ENTITY_IDS } from '../../shared/identifiers'

const DEBUG_RAYCAST_DISTANCE = 8 as const

const findLookedAtPylonEntity = (player: Player): Entity | undefined => {
    const hitEntity = player.getEntitiesFromViewDirection({
        maxDistance: DEBUG_RAYCAST_DISTANCE,
        type: ENTITY_IDS.pylonContainer,
    })[0]?.entity
    if (hitEntity?.isValid) return hitEntity

    const hitBlock = player.getBlockFromViewDirection({ maxDistance: DEBUG_RAYCAST_DISTANCE })?.block
    if (!hitBlock || !pylonKindRegistry.has(hitBlock.typeId)) return undefined
    return findPylonEntityAt(hitBlock.dimension, hitBlock.location)
}

export const handleDebugScriptEvent = (sourceEntity: Entity | undefined): void => {
    if (!(sourceEntity instanceof Player)) {
        world.sendMessage(`[Pylons:Debug] Managed pylon containers: ${entityManager.count()}`)
        return
    }

    const playerProfile = readPlayerUiProfile(sourceEntity) ?? 'unset'
    const entity = findLookedAtPylonEntity(sourceEntity)
    if (!entity) {
        sourceEntity.sendMessage(
            `§e[Pylons:Debug] No pylon targeted. Managed=${entityManager.count()}, Your UI profile=${playerProfile}`,
        )
        return
    }

    const definition = resolvePylonDefinition(entity)
    const blockId = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.pylonBlockId)
    const { ownerId, ownerName } = readPylonOwner(entity)
    const working = readPylonWorking(entity)
    const layoutProfile = readPylonProfile(entity)
    const sessions = pylonSessions.getSessions(entity.id)
    const sessionSummary =
        sessions.length > 0
            ? sessions.map(s => `${s.playerName}(${s.profile})`).join(', ')
            : 'none'
    const occupied = definition ? countOccupiedSlots(entity, definition) : 0
    const totalSlots = definition ? definition.slotSpec.count : 0
    const rangeSize = definition ? readPylonRange(entity, definition) : undefined
    const rangeLabel =
        definition && definition.rangeSpec.kind !== 'none' && rangeSize
            ? `${rangeSize} (${definition.rangeSpec.kind})`
            : 'none'
    const loc = entity.location
    const nameTagValue = entity.nameTag.length > 0 ? entity.nameTag : '<empty>'

    sourceEntity.sendMessage(
        [
            `§b[Pylons:Debug] §f${definition?.displayName ?? (typeof blockId === 'string' ? blockId : entity.typeId)} §7@ (${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})`,
            `§7  Entity nameTag: §f"${nameTagValue}" §7| Entity id: §f${entity.id}`,
            `§7  Owner: §f${ownerName} §8(${ownerId || 'none'})`,
            `§7  Working: ${working ? '§aON' : '§cOFF'} §7| Range: §f${rangeLabel} §7| Slots: §f${occupied}/${totalSlots}`,
            `§7  Entity layout: §f${layoutProfile} §7| Your profile: §f${playerProfile}`,
            `§7  Open sessions (${sessions.length}): §f${sessionSummary}`,
        ].join('\n'),
    )
}
