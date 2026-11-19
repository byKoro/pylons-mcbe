import { world } from '@minecraft/server'
import { pylonSessions } from '../core/pylon/PylonSessions'
import { clearFilterPlayerState } from '../features/filters/index'
import { clearExpulsionPlayerState } from '../features/pylons/expulsion/index'
import { clearProtectionPlayerState } from '../features/pylons/protection/index'

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
    pylonSessions.closeAllForPlayer(playerId)
    clearFilterPlayerState(playerId)
    clearExpulsionPlayerState(playerId)
    clearProtectionPlayerState(playerId)
})
