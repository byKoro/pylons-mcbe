import { Player, system } from '@minecraft/server'
import { handleDebugScriptEvent } from '../features/debug/debugReport'
import { handleSelftestScriptEvent } from '../features/debug/selftest'
import { handleUiProfileScriptEvent } from '../features/pylons/index'
import { SCRIPT_EVENT_IDS } from '../shared/identifiers'

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceEntity }) => {
    if (id === SCRIPT_EVENT_IDS.debug) {
        handleDebugScriptEvent(sourceEntity)
        return
    }
    if (id === SCRIPT_EVENT_IDS.selftest && sourceEntity instanceof Player) {
        handleSelftestScriptEvent(sourceEntity, message.trim())
        return
    }
    if (id === SCRIPT_EVENT_IDS.uiProfile && sourceEntity instanceof Player) {
        handleUiProfileScriptEvent(sourceEntity, message)
    }
})
