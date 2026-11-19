import { pylonKindRegistry } from '../../core/pylon/PylonKindRegistry'
import { registerProfilePromptHandler } from '../../core/pylon/PylonInteractions'
import { pylonWorkRegistry } from '../../core/pylon/PylonWorkRegistry'
import { EXPULSION_PYLON, expulsionWork } from './expulsion/index'
import { HARVESTER_PYLON, harvesterWork } from './harvester/index'
import { INFUSION_PYLON, infusionWork } from './infusion/index'
import { INTERDICTION_PYLON, interdictionWork } from './interdiction/index'
import { PROTECTION_PYLON, protectionWork } from './protection/index'
import { handleUiProfileScriptEvent, showUiProfilePrompt } from './uiProfilePrompt'

export const bootstrapPylonsFeature = (): void => {
    pylonKindRegistry.register(INFUSION_PYLON)
    pylonWorkRegistry.register(INFUSION_PYLON.id, infusionWork)
    pylonKindRegistry.register(HARVESTER_PYLON)
    pylonWorkRegistry.register(HARVESTER_PYLON.id, harvesterWork)
    pylonKindRegistry.register(EXPULSION_PYLON)
    pylonWorkRegistry.register(EXPULSION_PYLON.id, expulsionWork)
    pylonKindRegistry.register(INTERDICTION_PYLON)
    pylonWorkRegistry.register(INTERDICTION_PYLON.id, interdictionWork)
    pylonKindRegistry.register(PROTECTION_PYLON)
    pylonWorkRegistry.register(PROTECTION_PYLON.id, protectionWork)
    registerProfilePromptHandler(showUiProfilePrompt)
}

export { handleUiProfileScriptEvent }
