import { BlockComponentTypes, EntityComponentTypes, type Entity } from '@minecraft/server'
import { getLayoutForPylon, readPylonProfile, readPylonRange, readPylonWorking } from '../../../core/pylon/PylonLayout'
import { isPylonRedstonePowered } from '../../../core/pylon/PylonRedstone'
import type { PylonWork } from '../../../core/pylon/PylonWorkRegistry'
import type { PylonKindDefinition } from '../../../core/pylon/types'
import { VANILLA_ITEM_TAGS } from '../../../shared/identifiers'
import { safeGetBlock } from '../../../shared/world'
import { HARVESTER_PYLON_CONFIG } from './config'
import { executeHarvesterPlan } from './harvesterPlan'

export const harvesterWork: PylonWork = {
    update: (entity: Entity, definition: PylonKindDefinition): number => {
        const delay = HARVESTER_PYLON_CONFIG.workDelayTicks
        if (!readPylonWorking(entity)) return delay

        const { dimension, location } = entity
        const origin = {
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z),
        }

        const block = safeGetBlock(dimension, origin)
        if (!block) return delay
        if (isPylonRedstonePowered(block)) return delay

        const pylonContainer = entity.getComponent(EntityComponentTypes.Inventory)?.container
        if (!pylonContainer) return delay

        const toolSlot = getLayoutForPylon(readPylonProfile(entity), definition).filterSlots[0]
        if (toolSlot === undefined) return delay

        const hoe = pylonContainer.getItem(toolSlot)
        if (!hoe?.hasTag(VANILLA_ITEM_TAGS.hoe)) return delay

        const outputBlock = safeGetBlock(dimension, { x: origin.x, y: origin.y + 1, z: origin.z })
        if (!outputBlock || outputBlock.typeId === HARVESTER_PYLON_CONFIG.enderChestId) return delay

        const outputContainer = outputBlock.getComponent(BlockComponentTypes.Inventory)?.container
        if (!outputContainer) return delay

        const rangeSize = readPylonRange(entity, definition)
        if (!rangeSize) return delay

        executeHarvesterPlan({
            dimension,
            origin,
            rangeSize,
            hoe,
            pylonContainer,
            toolSlot,
            outputContainer,
        })
        return delay
    },
}
