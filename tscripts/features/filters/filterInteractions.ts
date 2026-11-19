import {
    EntityComponentTypes,
    EquipmentSlot,
    Player,
    system,
    type Entity,
    type EntityEquippableComponent,
    type ItemStack,
    type ItemUseBeforeEvent,
    type PlayerInteractWithBlockBeforeEvent,
    type PlayerInteractWithEntityBeforeEvent,
} from '@minecraft/server'
import { ENTITY_IDS, ITEM_IDS, isFilterItemTypeId } from '../../shared/identifiers'
import { MINIMUM_EFFECT_TICKS, POTION_FILTER_CONFIG, REQUIRED_EFFECT_TICKS, TICKS_PER_SECOND } from './config'
import {
    clearFilterPayload,
    hasCapturedFilterData,
    isClearableFilterTypeId,
    normalizeEffectId,
    readBlockFilter,
    readMobFilter,
    readPlayerFilter,
    readPotionFilter,
    writeFilterPayload,
} from './filterData'
import { applyFilterLore, formatEffectDisplayName, formatIdentifierName } from './filterLore'
import type { PotionFilterPayload } from './types'

const suppressedItemUseTicks = new Map<string, number>()

export const markPylonInteractTick = (playerId: string): void => {
    suppressedItemUseTicks.set(playerId, system.currentTick)
}

export const clearFilterPlayerState = (playerId: string): void => {
    suppressedItemUseTicks.delete(playerId)
}

const getEquippable = (player: Player): EntityEquippableComponent | undefined =>
    player.isValid ? player.getComponent(EntityComponentTypes.Equippable) : undefined

const clearHeldFilter = (player: Player): void => {
    const equippable = getEquippable(player)
    if (!equippable) return
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand || !isClearableFilterTypeId(mainhand.typeId)) return
    if (!hasCapturedFilterData(mainhand)) return

    clearFilterPayload(mainhand)
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)
    player.playSound('random.click', { volume: 0.4, pitch: 0.8 })
    player.onScreenDisplay.setActionBar('§eFilter cleared.')
}

const captureMobOnHeldFilter = (
    player: Player,
    entityTypeId: string,
    localizationKey: string,
): void => {
    const equippable = getEquippable(player)
    if (!equippable) return
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand || mainhand.typeId !== ITEM_IDS.mobFilter) return

    const existing = readMobFilter(mainhand)
    if (existing?.entityTypeId === entityTypeId && existing.localizationKey === localizationKey) {
        return
    }

    writeFilterPayload(mainhand, {
        kind: 'mob',
        entityTypeId,
        localizationKey,
    })
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)
    player.playSound('random.pop', { volume: 0.4, pitch: 1.2 })
    player.onScreenDisplay.setActionBar(`§aCaptured mob: §f${formatIdentifierName(entityTypeId)}`)
}

const capturePlayerOnHeldFilter = (
    player: Player,
    targetId: string,
    targetName: string,
): void => {
    const equippable = getEquippable(player)
    if (!equippable) return
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand || mainhand.typeId !== ITEM_IDS.playerFilter) return

    const existing = readPlayerFilter(mainhand)
    if (existing?.playerId === targetId && existing.playerName === targetName) {
        return
    }

    writeFilterPayload(mainhand, {
        kind: 'player',
        playerId: targetId,
        playerName: targetName,
    })
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)
    player.playSound('random.pop', { volume: 0.4, pitch: 1.2 })
    player.onScreenDisplay.setActionBar(`§aCaptured player: §f${targetName}`)
}

const captureBlockOnHeldFilter = (
    player: Player,
    blockTypeId: string,
    localizationKey: string,
): void => {
    const equippable = getEquippable(player)
    if (!equippable) return
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand || mainhand.typeId !== ITEM_IDS.blockFilter) return

    const existing = readBlockFilter(mainhand)
    if (existing?.blockTypeId === blockTypeId && existing.localizationKey === localizationKey) {
        return
    }

    writeFilterPayload(mainhand, {
        kind: 'block',
        blockTypeId,
        localizationKey,
    })
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)
    player.playSound('random.pop', { volume: 0.4, pitch: 1.2 })
    player.onScreenDisplay.setActionBar(`§aCaptured block: §f${formatIdentifierName(blockTypeId)}`)
}

const tryMergePotionFilters = (
    player: Player,
    equippable: EntityEquippableComponent,
    mainhand: ItemStack,
    mainPayload: PotionFilterPayload,
): boolean => {
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand)
    if (!offhand || offhand.typeId !== ITEM_IDS.potionFilter) return false

    const offPayload = readPotionFilter(offhand)
    if (!offPayload) return false
    if (
        offPayload.effectTypeId !== mainPayload.effectTypeId ||
        offPayload.amplifier !== mainPayload.amplifier
    ) {
        return false
    }

    const mergedTicks = Math.min(REQUIRED_EFFECT_TICKS, mainPayload.durationTicks + offPayload.durationTicks)
    writeFilterPayload(mainhand, {
        ...mainPayload,
        durationTicks: mergedTicks,
    })
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)

    clearFilterPayload(offhand)
    applyFilterLore(offhand)
    equippable.setEquipment(EquipmentSlot.Offhand, offhand)

    player.playSound('random.orb', { volume: 0.4, pitch: 1.2 })
    const seconds = Math.floor(mergedTicks / TICKS_PER_SECOND)
    const status =
        mergedTicks >= REQUIRED_EFFECT_TICKS
            ? '§aPotion Filter activated!'
            : `§bMerged Potion Filter: §f${seconds}/${POTION_FILTER_CONFIG.requiredDurationSeconds}s`
    player.onScreenDisplay.setActionBar(status)
    return true
}

const useHeldPotionFilter = (player: Player): void => {
    const equippable = getEquippable(player)
    if (!equippable) return
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand || mainhand.typeId !== ITEM_IDS.potionFilter) return

    const mainPayload = readPotionFilter(mainhand)
    if (mainPayload && mainPayload.durationTicks >= REQUIRED_EFFECT_TICKS) {
        return
    }

    if (mainPayload && tryMergePotionFilters(player, equippable, mainhand, mainPayload)) {
        return
    }

    const activeEffects = player.getEffects()
    const match = activeEffects.find(effect => {
        if (effect.duration < MINIMUM_EFFECT_TICKS) return false
        if (!mainPayload) return true
        return (
            normalizeEffectId(effect.typeId) === mainPayload.effectTypeId &&
            effect.amplifier === mainPayload.amplifier
        )
    })
    if (!match) return

    const nextTicks = mainPayload
        ? Math.min(REQUIRED_EFFECT_TICKS, mainPayload.durationTicks + match.duration)
        : match.duration
    const effectTypeId = normalizeEffectId(match.typeId)
    const nextPayload: PotionFilterPayload = {
        kind: 'potion',
        effectTypeId,
        amplifier: match.amplifier,
        durationTicks: nextTicks,
        displayName: match.displayName,
    }

    writeFilterPayload(mainhand, nextPayload)
    applyFilterLore(mainhand)
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand)
    player.removeEffect(match.typeId)

    player.playSound('random.orb', { volume: 0.4, pitch: 1.2 })
    const effectLabel = formatEffectDisplayName(match.displayName, effectTypeId, match.amplifier)
    const seconds = Math.floor(nextTicks / TICKS_PER_SECOND)
    const status =
        nextTicks >= REQUIRED_EFFECT_TICKS
            ? `§aActivated: §f${effectLabel}`
            : `§b${effectLabel}: §f${seconds}/${POTION_FILTER_CONFIG.requiredDurationSeconds}s`
    player.onScreenDisplay.setActionBar(status)
}

const isLivingTarget = (entity: Entity): boolean =>
    entity.hasComponent(EntityComponentTypes.Health)

export const handleBeforeFilterEntityInteract = (event: PlayerInteractWithEntityBeforeEvent): void => {
    const { itemStack, player, target } = event
    if (!itemStack || !isFilterItemTypeId(itemStack.typeId)) return
    if (target.typeId === ENTITY_IDS.pylonContainer) return

    if (player.isSneaking) {
        if (hasCapturedFilterData(itemStack)) {
            event.cancel = true
            system.run(() => clearHeldFilter(player))
        }
        return
    }

    if (itemStack.typeId === ITEM_IDS.mobFilter && isLivingTarget(target)) {
        const entityTypeId = target.typeId
        const localizationKey = target.localizationKey
        event.cancel = true
        system.run(() => captureMobOnHeldFilter(player, entityTypeId, localizationKey))
        return
    }

    if (itemStack.typeId === ITEM_IDS.playerFilter && target instanceof Player) {
        const targetId = target.id
        const targetName = target.name
        event.cancel = true
        system.run(() => capturePlayerOnHeldFilter(player, targetId, targetName))
    }
}

export const handleBeforeFilterBlockInteract = (event: PlayerInteractWithBlockBeforeEvent): void => {
    const { block, isFirstEvent, itemStack, player } = event
    if (!isFirstEvent || !itemStack || !isFilterItemTypeId(itemStack.typeId)) return

    if (player.isSneaking) {
        if (hasCapturedFilterData(itemStack)) {
            event.cancel = true
            system.run(() => clearHeldFilter(player))
        }
        return
    }

    if (itemStack.typeId !== ITEM_IDS.blockFilter || block.isAir) return

    const blockTypeId = block.typeId
    const localizationKey = block.localizationKey
    event.cancel = true
    system.run(() => captureBlockOnHeldFilter(player, blockTypeId, localizationKey))
}

export const handleBeforeFilterItemUse = (event: ItemUseBeforeEvent): void => {
    const { itemStack, source } = event
    if (!isFilterItemTypeId(itemStack.typeId)) return
    if (suppressedItemUseTicks.get(source.id) === system.currentTick) return

    if (source.isSneaking) {
        if (hasCapturedFilterData(itemStack)) {
            event.cancel = true
            system.run(() => clearHeldFilter(source))
        }
        return
    }

    if (itemStack.typeId === ITEM_IDS.potionFilter) {
        event.cancel = true
        system.run(() => useHeldPotionFilter(source))
    }
}
