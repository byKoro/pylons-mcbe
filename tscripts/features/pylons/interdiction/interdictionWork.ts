import { EntityComponentTypes, type Entity } from '@minecraft/server'
import {
    getLayoutForPylon,
    readPylonProfile,
    readPylonRange,
    readPylonWorking,
} from '../../../core/pylon/PylonLayout'
import { isPylonRedstonePowered } from '../../../core/pylon/PylonRedstone'
import type { PylonWork } from '../../../core/pylon/PylonWorkRegistry'
import type { PylonKindDefinition } from '../../../core/pylon/types'
import { safeGetBlock } from '../../../shared/world'
import { readFilterPayload, type FilterPayload } from '../../filters/index'
import { INTERDICTION_PYLON_CONFIG } from './config'
import { resolveInterdictionTargets } from './interdictionFilters'
import { removeInterdictionSource, setInterdictionSource, toChunkCoord, toInterdictionSourceKey } from './interdictionIndex'

export const interdictionWork: PylonWork = {
    update: (entity: Entity, definition: PylonKindDefinition): number => {
        const delay = INTERDICTION_PYLON_CONFIG.workDelayTicks
        const { dimension, location } = entity
        const origin = {
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z),
        }
        const key = toInterdictionSourceKey(dimension.id, origin)

        if (!readPylonWorking(entity)) {
            removeInterdictionSource(key)
            return delay
        }

        const block = safeGetBlock(dimension, origin)
        if (!block) return delay
        if (isPylonRedstonePowered(block)) {
            removeInterdictionSource(key)
            return delay
        }

        const container = entity.getComponent(EntityComponentTypes.Inventory)?.container
        if (!container) {
            removeInterdictionSource(key)
            return delay
        }

        const { filterSlots } = getLayoutForPylon(readPylonProfile(entity), definition)
        const payloads: (FilterPayload | undefined)[] = filterSlots.map(slot => {
            const item = container.getItem(slot)
            return item ? readFilterPayload(item) : undefined
        })

        const { lifeless, mobIds } = resolveInterdictionTargets(payloads)
        if (!lifeless && mobIds.length === 0) {
            removeInterdictionSource(key)
            return delay
        }

        let chunkRadius: number | undefined
        if (lifeless) {
            chunkRadius = INTERDICTION_PYLON_CONFIG.lifelessChunkRadius
        } else {
            const rangeSize = readPylonRange(entity, definition)
            chunkRadius = rangeSize ? INTERDICTION_PYLON_CONFIG.chunkRadii[rangeSize] : undefined
        }

        if (chunkRadius === undefined) {
            removeInterdictionSource(key)
            return delay
        }

        setInterdictionSource(key, {
            dimensionId: dimension.id,
            chunkX: toChunkCoord(origin.x),
            chunkZ: toChunkCoord(origin.z),
            chunkRadius,
            lifeless,
            mobIds,
        })
        return delay
    },
    remove: (entity: Entity): void => {
        const { dimension, location } = entity
        removeInterdictionSource(toInterdictionSourceKey(dimension.id, location))
    },
}
