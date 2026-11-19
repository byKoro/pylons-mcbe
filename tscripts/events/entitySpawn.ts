import { EntityComponentTypes, world } from '@minecraft/server'
import { isUiItemTypeId } from '../shared/identifiers'

const MINECRAFT_ITEM_ENTITY = 'minecraft:item' as const

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (entity.typeId !== MINECRAFT_ITEM_ENTITY) return
    const itemStack = entity.getComponent(EntityComponentTypes.Item)?.itemStack
    if (!itemStack || !isUiItemTypeId(itemStack.typeId)) return
    entity.remove()
})
