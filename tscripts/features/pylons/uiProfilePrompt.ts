import { system, type Player } from '@minecraft/server'
import {
    CustomForm,
    DataDrivenScreenClosedReason,
    FormRejectError,
    FormRejectReason,
    FormVisibilityError,
    PlayerLeftError,
} from '@minecraft/server-ui'
import type { UiProfile } from '../../core/pylon/types'
import { DYNAMIC_PROPERTY_IDS, RESOURCE_PACK_ID, SCRIPT_EVENT_IDS } from '../../shared/identifiers'

const MAX_BUSY_RETRIES = 6 as const
const BUSY_RETRY_DELAY_TICKS = 10 as const

const setPlayerUiProfile = (player: Player, profile: UiProfile): void => {
    if (!player.isValid) return
    player.setDynamicProperty(DYNAMIC_PROPERTY_IDS.uiProfile, profile)
    const label = profile === 'classic' ? 'Classic' : 'Pocket'
    player.sendMessage(`§aPylon UI profile set to §f${label}§a. Interact with a pylon to open it.`)
}

const selectProfile = (form: CustomForm, player: Player, profile: UiProfile): void => {
    setPlayerUiProfile(player, profile)
    if (form.isShowing()) form.close()
}

const showProfileFormAttempt = (player: Player, attempt: number): void => {
    if (!player.isValid) return

    const form = new CustomForm(player, 'Pylon UI Profile')
        .header('Choose your UI profile')
        .label(
            'Select the chest layout matching your Video UI Profile.\n' +
                'Classic: full panel overlay (Desktop / Classic).\n' +
                'Pocket: compact per-slot icons (Touch / Pocket).',
        )
        .divider()
        .button('Classic UI', () => selectProfile(form, player, 'classic'), {
            imageDetails: {
                imagePackId: RESOURCE_PACK_ID,
                imageSrc: 'textures/pylons/ui/classic_icon.png',
            },
            tooltip: 'Full panel overlay for Desktop / Classic UI',
        })
        .button('Pocket UI', () => selectProfile(form, player, 'pocket'), {
            imageDetails: {
                imagePackId: RESOURCE_PACK_ID,
                imageSrc: 'textures/pylons/ui/pocket_icon.png',
            },
            tooltip: 'Compact per-slot icons for Touch / Pocket UI',
        })
        .spacer()
        .label(`Change anytime with /scriptevent ${SCRIPT_EVENT_IDS.uiProfile}`)
        .closeButton()

    void form
        .show()
        .then(reason => {
            if (!player.isValid) return
            if (reason === DataDrivenScreenClosedReason.UserBusy && attempt < MAX_BUSY_RETRIES) {
                system.runTimeout(() => showProfileFormAttempt(player, attempt + 1), BUSY_RETRY_DELAY_TICKS)
            }
        })
        .catch((error: unknown) => {
            if (error instanceof PlayerLeftError) return
            if (error instanceof FormRejectError && error.reason === FormRejectReason.PlayerQuit) return
            if (error instanceof FormVisibilityError) return
            throw error
        })
}

export const showUiProfilePrompt = (player: Player): void => showProfileFormAttempt(player, 0)

export const handleUiProfileScriptEvent = (player: Player, message: string): void => {
    const trimmed = message.trim().toLowerCase()
    if (trimmed === 'classic' || trimmed === 'pocket') {
        setPlayerUiProfile(player, trimmed)
        return
    }
    showUiProfilePrompt(player)
}
