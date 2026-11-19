import { world } from '@minecraft/server'
import { pylonSessions } from '../core/pylon/PylonSessions'
import { clearFilterPlayerState } from '../features/filters/index'
import { clearProtectionPlayerState } from '../features/pylons/protection/index'

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
    pylonSessions.closeAllForPlayer(playerId)
    clearFilterPlayerState(playerId)
    clearProtectionPlayerState(playerId)
})
