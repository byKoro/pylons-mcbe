import { world } from '@minecraft/server'
import { discoverPylonEntities } from '../core/pylon/PylonLifecycle'
import { buildHarvesterCrops } from '../features/pylons/harvester/index'

world.afterEvents.worldLoad.subscribe(() => {
    discoverPylonEntities()
    buildHarvesterCrops()
})
