import type { Entity } from '@minecraft/server'
import type { PylonKindDefinition } from './types'

export interface PylonWork {
    update(entity: Entity, definition: PylonKindDefinition, tick: number): number
    remove?(entity: Entity): void
}

class PylonWorkRegistry {
    private readonly works = new Map<string, PylonWork>()

    register(kindId: string, work: PylonWork): void {
        this.works.set(kindId, work)
    }

    get(kindId: string): PylonWork | undefined {
        return this.works.get(kindId)
    }

    removeEntity(entity: Entity, kindId: string): void {
        this.works.get(kindId)?.remove?.(entity)
    }
}

export const pylonWorkRegistry = new PylonWorkRegistry()
