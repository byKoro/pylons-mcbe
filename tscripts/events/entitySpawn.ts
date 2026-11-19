import { EntityComponentTypes, world } from '@minecraft/server'
import { handleAfterEntitySpawnInterdiction } from '../features/pylons/interdiction/index'
import { isUiItemTypeId } from '../shared/identifiers'

const MINECRAFT_ITEM_ENTITY = 'minecraft:item' as const

world.afterEvents.entitySpawn.subscribe(event => {
    const { entity } = event
    if (!entity.isValid) return
    if (entity.typeId === MINECRAFT_ITEM_ENTITY) {
        const itemStack = entity.getComponent(EntityComponentTypes.Item)?.itemStack
        if (itemStack && isUiItemTypeId(itemStack.typeId)) {
            entity.remove()
        }
        return
    }
    handleAfterEntitySpawnInterdiction(event)
})
