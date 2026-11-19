import { EntityComponentTypes, type Entity } from '@minecraft/server'
import {
    getLayoutForPylon,
    readPylonOwner,
    readPylonProfile,
    readPylonWorking,
} from '../../../core/pylon/PylonLayout'
import type { PylonWork } from '../../../core/pylon/PylonWorkRegistry'
import type { PylonKindDefinition } from '../../../core/pylon/types'
import { IDLE_PYLON_DELAY_TICKS } from '../../../core/scheduler/Cadence'
import { readFilterPayload, type FilterPayload } from '../../filters/index'
import { resolveInfusionEffects } from './infusionEffects'
import { removeInfusionSource, setInfusionSource, toInfusionSourceKey } from './infusionIndex'

export const infusionWork: PylonWork = {
    update: (entity: Entity, definition: PylonKindDefinition): number => {
        const key = toInfusionSourceKey(entity)
        if (!readPylonWorking(entity)) {
            removeInfusionSource(key)
            return IDLE_PYLON_DELAY_TICKS
        }

        const { ownerId } = readPylonOwner(entity)
        if (ownerId.length === 0) {
            removeInfusionSource(key)
            return IDLE_PYLON_DELAY_TICKS
        }

        const container = entity.getComponent(EntityComponentTypes.Inventory)?.container
        if (!container) {
            removeInfusionSource(key)
            return IDLE_PYLON_DELAY_TICKS
        }

        const { filterSlots } = getLayoutForPylon(readPylonProfile(entity), definition)
        const payloads: (FilterPayload | undefined)[] = filterSlots.map(slot => {
            const item = container.getItem(slot)
            return item ? readFilterPayload(item) : undefined
        })

        const effects = resolveInfusionEffects(payloads)
        if (effects.length === 0) {
            removeInfusionSource(key)
            return IDLE_PYLON_DELAY_TICKS
        }

        setInfusionSource(key, { ownerId, effects })
        return IDLE_PYLON_DELAY_TICKS
    },
    remove: (entity: Entity): void => {
        removeInfusionSource(toInfusionSourceKey(entity))
    },
}
