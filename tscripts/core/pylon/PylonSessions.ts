import { EntityComponentTypes, ItemStack, Player, world, type Container, type Entity } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS, ITEM_IDS, isUiItemTypeId } from '../../shared/identifiers'
import { distanceSquared, viewsDiffer } from '../../shared/vector'
import { giveOrDropItem } from '../../shared/world'
import {
    CONTAINER_SIZE,
    createRangeButtonItem,
    createWorkingButtonItem,
    cyclePylonRange,
    expectedNonButtonUiItemId,
    getLayoutForPylon,
    getRangeItemId,
    readPylonOwner,
    readPylonProfile,
    readPylonRange,
    readPylonWorking,
} from './PylonLayout'
import type { OpenSession, PylonKindDefinition, UiProfile } from './types'

const VIEW_CAPTURE_DELAY_TICKS = 4 as const
const MAX_OPEN_DISTANCE_SQ = 64 as const

const stripPlayerUiItems = (player: Player): void => {
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container
    if (container) {
        for (let slot = 0; slot < container.size; slot++) {
            const item = container.getItem(slot)
            if (item && isUiItemTypeId(item.typeId)) container.setItem(slot, undefined)
        }
    }
    const cursor = player.getComponent(EntityComponentTypes.CursorInventory)
    if (cursor?.item && isUiItemTypeId(cursor.item.typeId)) cursor.clear()
}

const revalidateContainerSlots = (
    entity: Entity,
    definition: PylonKindDefinition,
    fallbackPlayer: Player | undefined,
): void => {
    const container: Container | undefined = entity.getComponent(EntityComponentTypes.Inventory)?.container
    if (!container) return

    const layout = getLayoutForPylon(readPylonProfile(entity), definition)
    let working = readPylonWorking(entity)
    const { ownerName } = readPylonOwner(entity)
    const expectedWorkingId = working ? ITEM_IDS.uiWorkingOn : ITEM_IDS.uiWorkingOff

    const currentWorking = container.getItem(layout.toggleButtonSlot)
    if (currentWorking?.typeId !== expectedWorkingId) {
        if (currentWorking && !isUiItemTypeId(currentWorking.typeId)) {
            giveOrDropItem(fallbackPlayer, entity.dimension, entity.location, currentWorking)
        }
        working = !working
        entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.working, working)
        container.setItem(layout.toggleButtonSlot, createWorkingButtonItem(definition, working, ownerName))
        entity.dimension.playSound('random.click', entity.location)
    }

    if (layout.rangeButtonSlot !== undefined) {
        const currentRange = readPylonRange(entity, definition)
        if (currentRange) {
            const expectedRangeId = getRangeItemId(currentRange)
            const currentRangeItem = container.getItem(layout.rangeButtonSlot)
            if (currentRangeItem?.typeId !== expectedRangeId) {
                if (currentRangeItem && !isUiItemTypeId(currentRangeItem.typeId)) {
                    giveOrDropItem(fallbackPlayer, entity.dimension, entity.location, currentRangeItem)
                }
                const nextRange = cyclePylonRange(entity, definition) ?? currentRange
                container.setItem(layout.rangeButtonSlot, createRangeButtonItem(definition, nextRange, ownerName))
                entity.dimension.playSound('random.click', entity.location)
            }
        }
    }

    const acceptedItemTag = definition.slotSpec.acceptedItemTag

    for (let slot = 0; slot < CONTAINER_SIZE; slot++) {
        if (layout.filterSlotSet.has(slot)) {
            const slotItem = container.getItem(slot)
            if (!slotItem) continue
            if (isUiItemTypeId(slotItem.typeId)) {
                container.setItem(slot, undefined)
                continue
            }
            if (acceptedItemTag && !slotItem.hasTag(acceptedItemTag)) {
                giveOrDropItem(fallbackPlayer, entity.dimension, entity.location, slotItem)
                container.setItem(slot, undefined)
                if (fallbackPlayer?.isValid) {
                    fallbackPlayer.playSound('note.bass', { volume: 0.4 })
                    fallbackPlayer.onScreenDisplay.setActionBar('§cOnly a hoe can be placed in this slot.')
                }
            }
            continue
        }
        if (slot === layout.toggleButtonSlot || slot === layout.rangeButtonSlot) continue
        const expectedId = expectedNonButtonUiItemId(layout, slot)
        const current = container.getItem(slot)
        if (current?.typeId !== expectedId) {
            if (current && !isUiItemTypeId(current.typeId)) {
                giveOrDropItem(fallbackPlayer, entity.dimension, entity.location, current)
            }
            container.setItem(slot, expectedId ? new ItemStack(expectedId, 1) : undefined)
        }
    }
}

class PylonSessions {
    private readonly byEntity = new Map<string, Map<string, OpenSession>>()

    open(entity: Entity, player: Player, profile: UiProfile, tick: number): void {
        let sessions = this.byEntity.get(entity.id)
        if (!sessions) {
            sessions = new Map<string, OpenSession>()
            this.byEntity.set(entity.id, sessions)
        }
        sessions.set(player.id, {
            playerId: player.id,
            playerName: player.name,
            profile,
            openedTick: tick,
        })
    }

    hasOpen(entityId: string): boolean {
        const sessions = this.byEntity.get(entityId)
        return sessions !== undefined && sessions.size > 0
    }

    getSessions(entityId: string): readonly OpenSession[] {
        const sessions = this.byEntity.get(entityId)
        return sessions ? [...sessions.values()] : []
    }

    hasConflictingProfile(entityId: string, profile: UiProfile): boolean {
        const sessions = this.byEntity.get(entityId)
        if (!sessions) return false
        for (const session of sessions.values()) {
            if (session.profile !== profile) return true
        }
        return false
    }

    closeAllForEntity(entityId: string): void {
        this.byEntity.delete(entityId)
    }

    closeAllForPlayer(playerId: string): void {
        this.byEntity.forEach((sessions, entityId) => {
            sessions.delete(playerId)
            if (sessions.size === 0) this.byEntity.delete(entityId)
        })
    }

    revalidate(entity: Entity, definition: PylonKindDefinition, tick: number): boolean {
        const sessions = this.byEntity.get(entity.id)
        if (!sessions || sessions.size === 0) return false

        const entityLocation = entity.location
        const entityDimensionId = entity.dimension.id
        const activePlayers: Player[] = []
        let lastKnownPlayer: Player | undefined

        sessions.forEach((session, playerId) => {
            const candidate = world.getEntity(playerId)
            if (!(candidate instanceof Player) || !candidate.isValid) {
                sessions.delete(playerId)
                return
            }
            lastKnownPlayer = candidate
            stripPlayerUiItems(candidate)
            if (
                candidate.dimension.id !== entityDimensionId ||
                distanceSquared(candidate.location, entityLocation) > MAX_OPEN_DISTANCE_SQ
            ) {
                sessions.delete(playerId)
                return
            }
            if (tick >= session.openedTick + VIEW_CAPTURE_DELAY_TICKS) {
                const currentView = candidate.getViewDirection()
                if (!session.initialViewDir) {
                    session.initialViewDir = currentView
                } else if (viewsDiffer(currentView, session.initialViewDir)) {
                    sessions.delete(playerId)
                    return
                }
            }
            activePlayers.push(candidate)
        })

        revalidateContainerSlots(entity, definition, activePlayers[0] ?? lastKnownPlayer)

        if (sessions.size === 0) {
            this.byEntity.delete(entity.id)
            return false
        }
        return true
    }
}

export const pylonSessions = new PylonSessions()
