import { world } from '@minecraft/server'
import { pylonSessions } from '../core/pylon/PylonSessions'
import { clearFilterPlayerState } from '../features/filters/index'

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
    pylonSessions.closeAllForPlayer(playerId)
    clearFilterPlayerState(playerId)
})
