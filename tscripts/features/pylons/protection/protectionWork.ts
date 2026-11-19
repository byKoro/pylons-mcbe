import { EntityComponentTypes, type Entity } from '@minecraft/server'
import {
    getLayoutForPylon,
    readPylonOwner,
    readPylonProfile,
    readPylonRange,
    readPylonWorking,
} from '../../../core/pylon/PylonLayout'
import { isPylonRedstonePowered } from '../../../core/pylon/PylonRedstone'
import type { PylonWork } from '../../../core/pylon/PylonWorkRegistry'
import type { PylonKindDefinition } from '../../../core/pylon/types'
import { safeGetBlock } from '../../../shared/world'
import { readFilterPayload, type FilterPayload } from '../../filters/index'
import { PROTECTION_PYLON_CONFIG } from './config'
import { resolveProtectionTargets } from './protectionFilters'
import { removeProtectionSource, setProtectionSource, toChunkCoord, toProtectionSourceKey } from './protectionIndex'

export const protectionWork: PylonWork = {
    update: (entity: Entity, definition: PylonKindDefinition): number => {
        const delay = PROTECTION_PYLON_CONFIG.workDelayTicks
        const { dimension, location } = entity
        const origin = {
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z),
        }
        const key = toProtectionSourceKey(dimension.id, origin)

        if (!readPylonWorking(entity)) {
            removeProtectionSource(key)
            return delay
        }

        const { ownerId } = readPylonOwner(entity)
        if (ownerId.length === 0) {
            removeProtectionSource(key)
            return delay
        }

        const block = safeGetBlock(dimension, origin)
        if (!block) return delay
        if (isPylonRedstonePowered(block)) {
            removeProtectionSource(key)
            return delay
        }

        const rangeSize = readPylonRange(entity, definition)
        const chunkRadius = rangeSize ? PROTECTION_PYLON_CONFIG.chunkRadii[rangeSize] : undefined
        if (chunkRadius === undefined) {
            removeProtectionSource(key)
            return delay
        }

        const container = entity.getComponent(EntityComponentTypes.Inventory)?.container
        if (!container) {
            removeProtectionSource(key)
            return delay
        }

        const { filterSlots } = getLayoutForPylon(readPylonProfile(entity), definition)
        const payloads: (FilterPayload | undefined)[] = filterSlots.map(slot => {
            const item = container.getItem(slot)
            return item ? readFilterPayload(item) : undefined
        })

        const { blockIds, mobIds } = resolveProtectionTargets(payloads)
        if (blockIds.length === 0 && mobIds.length === 0) {
            removeProtectionSource(key)
            return delay
        }

        setProtectionSource(key, {
            ownerId,
            dimensionId: dimension.id,
            chunkX: toChunkCoord(origin.x),
            chunkZ: toChunkCoord(origin.z),
            chunkRadius,
            blockIds,
            mobIds,
        })
        return delay
    },
    remove: (entity: Entity): void => {
        const { dimension, location } = entity
        removeProtectionSource(toProtectionSourceKey(dimension.id, location))
    },
}
