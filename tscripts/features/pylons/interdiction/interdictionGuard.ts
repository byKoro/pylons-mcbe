import {
    EntityComponentTypes,
    EntityInitializationCause,
    Player,
    type EntitySpawnAfterEvent,
} from '@minecraft/server'
import { isPylonsTypeId } from '../../../shared/identifiers'
import {
    hasActiveInterdiction,
    isChunkLifeless,
    isMobBlockedInChunk,
    toChunkCoord,
} from './interdictionIndex'

const INANIMATE_TYPE_FAMILY = 'inanimate' as const

export const handleAfterEntitySpawnInterdiction = (event: EntitySpawnAfterEvent): void => {
    const { cause, entity } = event
    if (cause === EntityInitializationCause.Loaded) return
    if (!hasActiveInterdiction()) return
    if (!entity.isValid) return
    if (entity instanceof Player) return

    const { typeId } = entity
    if (isPylonsTypeId(typeId)) return

    const { dimension, location } = entity
    const chunkX = toChunkCoord(location.x)
    const chunkZ = toChunkCoord(location.z)

    if (isMobBlockedInChunk(dimension.id, chunkX, chunkZ, typeId)) {
        entity.remove()
        return
    }

    if (cause !== EntityInitializationCause.Spawned) return
    if (!isChunkLifeless(dimension.id, chunkX, chunkZ)) return
    if (!entity.hasComponent(EntityComponentTypes.Health)) return

    const typeFamily = entity.getComponent(EntityComponentTypes.TypeFamily)
    if (typeFamily?.hasTypeFamily(INANIMATE_TYPE_FAMILY)) return

    entity.remove()
}
