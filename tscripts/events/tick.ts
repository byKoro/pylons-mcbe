import { system } from '@minecraft/server'
import { updateSneakCollisionWatcher } from '../core/pylon/PylonSneakExposure'
import { entityManager } from '../core/runtime/EntityManager'
import { tickInfusionOwners } from '../features/pylons/infusion/index'

system.runInterval(() => {
    const tick = system.currentTick
    updateSneakCollisionWatcher(tick)
    entityManager.tick(tick)
    tickInfusionOwners(tick)
})
