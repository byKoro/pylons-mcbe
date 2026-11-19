import { Player, world } from '@minecraft/server'
import { handlePylonEntityHitHint } from '../core/pylon/PylonSneakExposure'

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
    if (!(damagingEntity instanceof Player)) return
    handlePylonEntityHitHint(damagingEntity, hitEntity)
})
