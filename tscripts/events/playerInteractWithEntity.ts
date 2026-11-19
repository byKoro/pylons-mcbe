import { world } from '@minecraft/server'
import { handleAfterInteractWithPylon, handleBeforeInteractWithPylon } from '../core/pylon/PylonInteractions'
import { handleBeforeFilterEntityInteract, markPylonInteractTick } from '../features/filters/index'
import { ENTITY_IDS, isFilterItemTypeId } from '../shared/identifiers'

world.beforeEvents.playerInteractWithEntity.subscribe(event => {
    if (event.target.typeId === ENTITY_IDS.pylonContainer) {
        markPylonInteractTick(event.player.id)
        handleBeforeInteractWithPylon(event)
        return
    }
    if (event.itemStack && isFilterItemTypeId(event.itemStack.typeId)) {
        handleBeforeFilterEntityInteract(event)
    }
})

world.afterEvents.playerInteractWithEntity.subscribe(event => {
    if (event.target.typeId === ENTITY_IDS.pylonContainer) {
        handleAfterInteractWithPylon(event)
    }
})
