import { world } from '@minecraft/server'
import { pylonKindRegistry } from '../core/pylon/PylonKindRegistry'
import { spawnPylonEntity } from '../core/pylon/PylonLifecycle'

world.afterEvents.playerPlaceBlock.subscribe(({ block, player }) => {
    if (!pylonKindRegistry.has(block.typeId)) return
    spawnPylonEntity(block, player)
})
