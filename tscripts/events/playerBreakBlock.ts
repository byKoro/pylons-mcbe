import { world } from '@minecraft/server'
import { handleBeforeBreakPylon } from '../core/pylon/PylonInteractions'

world.beforeEvents.playerBreakBlock.subscribe(handleBeforeBreakPylon)
