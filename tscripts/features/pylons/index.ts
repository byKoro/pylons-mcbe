import { pylonKindRegistry } from '../../core/pylon/PylonKindRegistry'
import { registerProfilePromptHandler } from '../../core/pylon/PylonInteractions'
import { pylonWorkRegistry } from '../../core/pylon/PylonWorkRegistry'
import { EXPULSION_PYLON } from './expulsion/index'
import { HARVESTER_PYLON } from './harvester/index'
import { INFUSION_PYLON, infusionWork } from './infusion/index'
import { INTERDICTION_PYLON } from './interdiction/index'
import { PROTECTION_PYLON } from './protection/index'
import { handleUiProfileScriptEvent, showUiProfilePrompt } from './uiProfilePrompt'

export const bootstrapPylonsFeature = (): void => {
    pylonKindRegistry.register(INFUSION_PYLON)
    pylonWorkRegistry.register(INFUSION_PYLON.id, infusionWork)
    pylonKindRegistry.register(HARVESTER_PYLON)
    pylonKindRegistry.register(EXPULSION_PYLON)
    pylonKindRegistry.register(INTERDICTION_PYLON)
    pylonKindRegistry.register(PROTECTION_PYLON)
    registerProfilePromptHandler(showUiProfilePrompt)
}

export { handleUiProfileScriptEvent }
