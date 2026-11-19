import { world } from '@minecraft/server'
import { ensureFilterLoreInSlot } from '../features/filters/index'
import { FILTER_ITEM_TYPE_IDS } from '../shared/identifiers'

world.afterEvents.playerInventoryItemChange.subscribe(
    ({ inventoryType, itemStack, player, slot }) => {
        if (itemStack) ensureFilterLoreInSlot(player, slot, inventoryType, itemStack)
    },
    { includeItems: [...FILTER_ITEM_TYPE_IDS] },
)
