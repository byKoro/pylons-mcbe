import { system } from '@minecraft/server'
import { toStaggerOffset, WARMUP_TICKS } from '../scheduler/Cadence'
import type { ManagedAgent } from './types'

interface Registration {
    readonly agent: ManagedAgent
    nextUpdateTick: number
}

class EntityManager {
    private readonly registrations = new Map<string, Registration>()

    attach(agent: ManagedAgent, tick: number): void {
        const current = this.registrations.get(agent.entity.id)
        if (current?.agent.entity.isValid) return
        current?.agent.dispose()
        this.registrations.set(agent.entity.id, {
            agent,
            nextUpdateTick: tick + WARMUP_TICKS + toStaggerOffset(agent.entity.id),
        })
    }

    wakeNow(id: string, tick: number): void {
        const registration = this.registrations.get(id)
        if (!registration) return
        registration.nextUpdateTick = tick
    }

    handleRemoved(id: string): void {
        const registration = this.registrations.get(id)
        if (!registration) return
        this.registrations.delete(id)
        system.run(() => registration.agent.dispose())
    }

    count(): number {
        return this.registrations.size
    }

    tick(tick: number): void {
        this.registrations.forEach((registration, id) => {
            if (registration.nextUpdateTick > tick) return
            if (!registration.agent.entity.isValid) {
                this.registrations.delete(id)
                registration.agent.dispose()
                return
            }
            registration.nextUpdateTick = tick + registration.agent.update(tick)
        })
    }
}

export const entityManager = new EntityManager()
