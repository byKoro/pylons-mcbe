import {
    system,
    type Player,
    type PlayerBreakBlockBeforeEvent,
    type PlayerInteractWithEntityAfterEvent,
    type PlayerInteractWithEntityBeforeEvent,
} from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS, ENTITY_IDS } from '../../shared/identifiers'
import { isOperator } from '../../shared/permissions'
import { entityManager } from '../runtime/EntityManager'
import { pylonKindRegistry } from './PylonKindRegistry'
import { readPylonOwner, syncPylonContainer } from './PylonLayout'
import { ensurePylonNameTag, findPylonEntityAt, resolvePylonDefinition } from './PylonLifecycle'
import { pylonSessions } from './PylonSessions'
import type { UiProfile } from './types'

type ProfilePromptHandler = (player: Player) => void

let profilePromptHandler: ProfilePromptHandler | undefined

export const registerProfilePromptHandler = (handler: ProfilePromptHandler): void => {
    profilePromptHandler = handler
}

export const readPlayerUiProfile = (player: Player): UiProfile | undefined => {
    const raw = player.getDynamicProperty(DYNAMIC_PROPERTY_IDS.uiProfile)
    if (raw === 'classic' || raw === 'pocket') return raw
    return undefined
}

const canAccessPylon = (player: Player, ownerId: string): boolean =>
    ownerId === '' || ownerId === player.id || isOperator(player)

export const handleBeforeInteractWithPylon = (event: PlayerInteractWithEntityBeforeEvent): void => {
    const { player, target } = event
    if (target.typeId !== ENTITY_IDS.pylonContainer) return

    const { ownerId } = readPylonOwner(target)
    if (!canAccessPylon(player, ownerId)) {
        event.cancel = true
        system.run(() => {
            if (!player.isValid) return
            player.playSound('note.bass', { volume: 0.4 })
            player.sendMessage('§cOnly the pylon owner or an operator can open this pylon.')
        })
        return
    }

    const profile = readPlayerUiProfile(player)
    if (!profile) {
        event.cancel = true
        const handler = profilePromptHandler
        if (handler) system.run(() => handler(player))
        return
    }

    if (pylonSessions.hasConflictingProfile(target.id, profile)) {
        event.cancel = true
        system.run(() => {
            if (!player.isValid) return
            player.playSound('note.bass', { volume: 0.4 })
            player.sendMessage('§cAnother player currently has this pylon open in a different UI profile.')
        })
    }
}

export const handleAfterInteractWithPylon = (event: PlayerInteractWithEntityAfterEvent): void => {
    const { player, target } = event
    if (target.typeId !== ENTITY_IDS.pylonContainer) return

    const profile = readPlayerUiProfile(player)
    if (!profile) return

    const { ownerId } = readPylonOwner(target)
    if (!canAccessPylon(player, ownerId)) return

    const definition = resolvePylonDefinition(target)
    if (!definition) return

    ensurePylonNameTag(target, definition)
    syncPylonContainer(target, definition, profile, true)
    pylonSessions.open(target, player, profile, system.currentTick)
    entityManager.wakeNow(target.id, system.currentTick)
}

export const handleBeforeBreakPylon = (event: PlayerBreakBlockBeforeEvent): void => {
    const { block, dimension, player } = event
    if (!pylonKindRegistry.has(block.typeId)) return

    const entity = findPylonEntityAt(dimension, block.location)
    if (!entity) return

    const { ownerId } = readPylonOwner(entity)
    if (canAccessPylon(player, ownerId)) return

    event.cancel = true
    system.run(() => {
        if (!player.isValid) return
        player.playSound('note.bass', { volume: 0.4 })
        player.sendMessage('§cOnly the pylon owner or an operator can break this pylon.')
    })
}
