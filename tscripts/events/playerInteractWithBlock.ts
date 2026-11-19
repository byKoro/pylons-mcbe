import { world } from '@minecraft/server'
import { handleBeforeFilterBlockInteract } from '../features/filters/index'
import { isFilterItemTypeId } from '../shared/identifiers'

world.beforeEvents.playerInteractWithBlock.subscribe(event => {
    if (!event.itemStack || !isFilterItemTypeId(event.itemStack.typeId)) return
    handleBeforeFilterBlockInteract(event)
})
