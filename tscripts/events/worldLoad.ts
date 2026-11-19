import { world } from '@minecraft/server'
import { discoverPylonEntities } from '../core/pylon/PylonLifecycle'

world.afterEvents.worldLoad.subscribe(() => {
    discoverPylonEntities()
})
