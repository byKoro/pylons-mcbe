import { world } from '@minecraft/server'
import { pylonKindRegistry } from '../core/pylon/PylonKindRegistry'
import { destroyPylonAt } from '../core/pylon/PylonLifecycle'

world.afterEvents.blockExplode.subscribe(({ block, dimension, explodedBlockPermutation }) => {
    if (!pylonKindRegistry.has(explodedBlockPermutation.type.id)) return
    destroyPylonAt(dimension, block.location)
})
