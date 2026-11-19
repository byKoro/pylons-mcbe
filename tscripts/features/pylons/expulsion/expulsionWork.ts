import { EntityComponentTypes, world, type Entity } from '@minecraft/server'
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
import { EXPULSION_PYLON_CONFIG } from './config'
import { resolveExpulsionWhitelist } from './expulsionFilters'
import { removeExpulsionSource, setExpulsionSource, toChunkCoord, toExpulsionSourceKey } from './expulsionIndex'

const isAllowedExpulsionDimension = (dimensionId: string): boolean =>
    EXPULSION_PYLON_CONFIG.allowedDimensions.includes(dimensionId)

const isOutsideWorldSpawn = (
    dimensionId: string,
    chunkX: number,
    chunkZ: number,
    chunkRadius: number,
): boolean => {
    if (dimensionId !== 'minecraft:overworld') return true

    const spawn = world.getDefaultSpawnLocation()
    const radius = Math.max(EXPULSION_PYLON_CONFIG.worldSpawnRadiusBlocks, world.gameRules.spawnRadius)

    const spawnMinX = Math.floor(spawn.x) - radius
    const spawnMaxX = Math.floor(spawn.x) + 1 + radius
    const spawnMinZ = Math.floor(spawn.z) - radius
    const spawnMaxZ = Math.floor(spawn.z) + 1 + radius

    const pylonMinX = (chunkX - chunkRadius) * 16
    const pylonMaxX = (chunkX + chunkRadius + 1) * 16
    const pylonMinZ = (chunkZ - chunkRadius) * 16
    const pylonMaxZ = (chunkZ + chunkRadius + 1) * 16

    return !(pylonMinX < spawnMaxX && pylonMaxX > spawnMinX && pylonMinZ < spawnMaxZ && pylonMaxZ > spawnMinZ)
}

export const expulsionWork: PylonWork = {
    update: (entity: Entity, definition: PylonKindDefinition): number => {
        const delay = EXPULSION_PYLON_CONFIG.workDelayTicks
        const { dimension, location } = entity
        const origin = {
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z),
        }
        const key = toExpulsionSourceKey(dimension.id, origin)

        if (!readPylonWorking(entity)) {
            removeExpulsionSource(key)
            return delay
        }

        const { ownerId, ownerName } = readPylonOwner(entity)
        if (ownerId.length === 0) {
            removeExpulsionSource(key)
            return delay
        }

        if (!isAllowedExpulsionDimension(dimension.id)) {
            removeExpulsionSource(key)
            return delay
        }

        const block = safeGetBlock(dimension, origin)
        if (!block) return delay
        if (isPylonRedstonePowered(block)) {
            removeExpulsionSource(key)
            return delay
        }

        const rangeSize = readPylonRange(entity, definition)
        const chunkRadius = rangeSize ? EXPULSION_PYLON_CONFIG.chunkRadii[rangeSize] : undefined
        if (chunkRadius === undefined) {
            removeExpulsionSource(key)
            return delay
        }

        const chunkX = toChunkCoord(origin.x)
        const chunkZ = toChunkCoord(origin.z)
        if (!isOutsideWorldSpawn(dimension.id, chunkX, chunkZ, chunkRadius)) {
            removeExpulsionSource(key)
            return delay
        }

        const container = entity.getComponent(EntityComponentTypes.Inventory)?.container
        if (!container) {
            removeExpulsionSource(key)
            return delay
        }

        const { filterSlots } = getLayoutForPylon(readPylonProfile(entity), definition)
        const payloads: (FilterPayload | undefined)[] = filterSlots.map(slot => {
            const item = container.getItem(slot)
            return item ? readFilterPayload(item) : undefined
        })

        const allowedPlayerIds = resolveExpulsionWhitelist(payloads)

        setExpulsionSource(key, {
            ownerId,
            ownerName,
            dimensionId: dimension.id,
            chunkX,
            chunkZ,
            chunkRadius,
            allowedPlayerIds,
        })
        return delay
    },
    remove: (entity: Entity): void => {
        const { dimension, location } = entity
        removeExpulsionSource(toExpulsionSourceKey(dimension.id, location))
    },
}
