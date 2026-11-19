import { EntityComponentTypes, type Block, type Dimension, type ItemStack, type Player, type Vector3 } from '@minecraft/server'

export const safeGetBlock = (dimension: Dimension, location: Vector3): Block | undefined => {
    try {
        return dimension.getBlock(location)
    } catch {
        return undefined
    }
}

export const giveOrDropItem = (player: Player | undefined, dimension: Dimension, dropLocation: Vector3, item: ItemStack): void => {
    if (player?.isValid) {
        const container = player.getComponent(EntityComponentTypes.Inventory)?.container
        const leftover = container?.addItem(item)
        if (!leftover) return
        dimension.spawnItem(leftover, dropLocation)
        return
    }
    dimension.spawnItem(item, dropLocation)
}
