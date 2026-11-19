import type { Entity } from '@minecraft/server'

export interface ManagedAgent {
    readonly entity: Entity
    update(tick: number): number
    dispose(): void
}
