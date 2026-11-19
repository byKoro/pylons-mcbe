import { world } from '@minecraft/server'
import { attachOrCleanPylonEntity } from '../core/pylon/PylonLifecycle'
import { ENTITY_IDS } from '../shared/identifiers'

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId !== ENTITY_IDS.pylonContainer) return
    attachOrCleanPylonEntity(entity)
})
