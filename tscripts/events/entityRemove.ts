import { world } from '@minecraft/server'
import { entityManager } from '../core/runtime/EntityManager'
import { ENTITY_IDS } from '../shared/identifiers'

world.beforeEvents.entityRemove.subscribe(({ removedEntity }) => {
    if (removedEntity.typeId !== ENTITY_IDS.pylonContainer) return
    entityManager.handleRemoved(removedEntity.id)
})
