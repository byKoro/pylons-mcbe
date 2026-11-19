import { world } from '@minecraft/server'
import { handleBeforeBreakPylon } from '../core/pylon/PylonInteractions'
import { handleBeforeBreakProtectedBlock } from '../features/pylons/protection/index'

world.beforeEvents.playerBreakBlock.subscribe(event => {
    handleBeforeBreakPylon(event)
    if (!event.cancel) handleBeforeBreakProtectedBlock(event)
})
