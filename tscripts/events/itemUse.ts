import { world } from '@minecraft/server'
import { handleBeforeFilterItemUse } from '../features/filters/index'
import { isFilterItemTypeId } from '../shared/identifiers'

world.beforeEvents.itemUse.subscribe(event => {
    if (!isFilterItemTypeId(event.itemStack.typeId)) return
    handleBeforeFilterItemUse(event)
})
