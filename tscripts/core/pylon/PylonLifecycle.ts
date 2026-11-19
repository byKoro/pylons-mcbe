import { BlockPermutation, system, world, type Block, type Dimension, type Entity, type Player, type Vector3 } from '@minecraft/server'
import { BLOCK_STATE_IDS, DIMENSION_IDS, DYNAMIC_PROPERTY_IDS, ENTITY_EVENT_IDS, ENTITY_IDS } from '../../shared/identifiers'
import { safeGetBlock } from '../../shared/world'
import { entityManager } from '../runtime/EntityManager'
import type { ManagedAgent } from '../runtime/types'
import { IDLE_PYLON_DELAY_TICKS, OPEN_UI_DELAY_TICKS } from '../scheduler/Cadence'
import { pylonKindRegistry } from './PylonKindRegistry'
import {
    CURRENT_LAYOUT_VERSION,
    dropRealSlotItems,
    readPylonProfile,
    syncPylonContainer,
} from './PylonLayout'
import { pylonSessions } from './PylonSessions'
import { pylonWorkRegistry } from './PylonWorkRegistry'
import type { PylonKindDefinition, UiProfile } from './types'

const cellCenter = (location: Vector3): Vector3 => ({
    x: Math.floor(location.x) + 0.5,
    y: Math.floor(location.y) + 0.5,
    z: Math.floor(location.z) + 0.5,
})

export const findPylonEntityAt = (dimension: Dimension, location: Vector3): Entity | undefined =>
    dimension.getEntities({
        type: ENTITY_IDS.pylonContainer,
        location: cellCenter(location),
        maxDistance: 0.9,
        closest: 1,
    })[0]

export const resolvePylonDefinition = (entity: Entity): PylonKindDefinition | undefined => {
    const blockId = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.pylonBlockId)
    if (typeof blockId === 'string') {
        const registered = pylonKindRegistry.get(blockId)
        if (registered) return registered
    }
    const block = safeGetBlock(entity.dimension, entity.location)
    return block ? pylonKindRegistry.get(block.typeId) : undefined
}

export const destroyPylonEntity = (entity: Entity): void => {
    pylonSessions.closeAllForEntity(entity.id)
    if (entity.isValid) {
        const definition = resolvePylonDefinition(entity)
        if (definition) pylonWorkRegistry.removeEntity(entity, definition.id)
        dropRealSlotItems(entity, definition)
        entityManager.handleRemoved(entity.id)
        entity.remove()
        return
    }
    entityManager.handleRemoved(entity.id)
}

export const destroyPylonAt = (dimension: Dimension, location: Vector3): void => {
    const entity = findPylonEntityAt(dimension, location)
    if (entity) destroyPylonEntity(entity)
}

export const createPylonAgent = (entity: Entity): ManagedAgent => {
    let nextWorkTick = 0

    return {
        entity,
        update: tick => {
            const block = safeGetBlock(entity.dimension, entity.location)
            if (block && !pylonKindRegistry.has(block.typeId)) {
                destroyPylonEntity(entity)
                return IDLE_PYLON_DELAY_TICKS
            }
            const definition = block ? pylonKindRegistry.get(block.typeId) : resolvePylonDefinition(entity)
            if (!definition) return IDLE_PYLON_DELAY_TICKS
            const sessionDelay = pylonSessions.revalidate(entity, definition, tick)
                ? OPEN_UI_DELAY_TICKS
                : IDLE_PYLON_DELAY_TICKS
            if (!entity.isValid) return IDLE_PYLON_DELAY_TICKS
            const work = pylonWorkRegistry.get(definition.id)
            if (!work) return sessionDelay
            if (tick >= nextWorkTick) {
                nextWorkTick = tick + work.update(entity, definition, tick)
            }
            return Math.max(1, Math.min(sessionDelay, nextWorkTick - tick))
        },
        dispose: () => {
            pylonSessions.closeAllForEntity(entity.id)
        },
    }
}

export const setPylonFakeSelection = (block: Block, enabled: boolean): void => {
    if (!pylonKindRegistry.has(block.typeId)) return
    const states = block.permutation.getAllStates()
    const current = states[BLOCK_STATE_IDS.fakeSelection]
    if (typeof current !== 'boolean' || current === enabled) return
    block.setPermutation(
        BlockPermutation.resolve(block.typeId, {
            ...states,
            [BLOCK_STATE_IDS.fakeSelection]: enabled,
        }),
    )
}

export const ensurePylonNameTag = (entity: Entity, definition: PylonKindDefinition): void => {
    if (entity.nameTag !== definition.displayName) entity.nameTag = definition.displayName
}

export const spawnPylonEntity = (block: Block, placer?: Player): Entity | undefined => {
    const definition = pylonKindRegistry.get(block.typeId)
    if (!definition) return undefined

    setPylonFakeSelection(block, true)

    const existing = findPylonEntityAt(block.dimension, block.location)
    if (existing) {
        ensurePylonNameTag(existing, definition)
        entityManager.attach(createPylonAgent(existing), system.currentTick)
        return existing
    }

    const entity = block.dimension.spawnEntity(ENTITY_IDS.pylonContainer, block.bottomCenter())
    const placerProfile = placer?.getDynamicProperty(DYNAMIC_PROPERTY_IDS.uiProfile)
    const initialProfile: UiProfile = placerProfile === 'pocket' ? 'pocket' : 'classic'

    entity.nameTag = definition.displayName
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.pylonBlockId, block.typeId)
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.ownerId, placer?.id ?? '')
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.ownerName, placer?.name ?? 'None')
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.working, true)
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutProfile, initialProfile)
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutVersion, CURRENT_LAYOUT_VERSION)
    if (definition.rangeSpec.kind !== 'none' && definition.rangeSpec.sizes[0]) {
        entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.range, definition.rangeSpec.sizes[0])
    }

    syncPylonContainer(entity, definition, initialProfile, true)
    entityManager.attach(createPylonAgent(entity), system.currentTick)
    system.runTimeout(() => {
        if (entity.isValid) ensurePylonNameTag(entity, definition)
    }, 1)
    return entity
}

export const attachOrCleanPylonEntity = (entity: Entity): void => {
    const block = safeGetBlock(entity.dimension, entity.location)
    if (block && !pylonKindRegistry.has(block.typeId)) {
        destroyPylonEntity(entity)
        return
    }
    const definition = block ? pylonKindRegistry.get(block.typeId) : resolvePylonDefinition(entity)
    if (!definition) {
        entityManager.attach(createPylonAgent(entity), system.currentTick)
        return
    }
    if (block) setPylonFakeSelection(block, true)
    ensurePylonNameTag(entity, definition)
    entity.triggerEvent(ENTITY_EVENT_IDS.resetState)
    syncPylonContainer(entity, definition, readPylonProfile(entity), true)
    entityManager.attach(createPylonAgent(entity), system.currentTick)
}

export const discoverPylonEntities = (): void =>
    DIMENSION_IDS.forEach(dimensionId => {
        world.getDimension(dimensionId).getEntities({ type: ENTITY_IDS.pylonContainer }).forEach(attachOrCleanPylonEntity)
    })
