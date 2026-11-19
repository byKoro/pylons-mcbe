import {
    EntityComponentTypes,
    PlayerInventoryType,
    type Container,
    type ItemStack,
    type Player,
    type RawMessage,
} from '@minecraft/server'
import { ITEM_IDS, isFilterItemTypeId } from '../../shared/identifiers'
import { POTION_FILTER_CONFIG, REQUIRED_EFFECT_TICKS, TICKS_PER_SECOND } from './config'
import {
    formatRomanLevel,
    hasCapturedFilterData,
    isEffectAllowed,
    isHarmfulEffect,
    isPotionPotencyCapped,
    readBlockFilter,
    readMobFilter,
    readPlayerFilter,
    readPotionFilter,
} from './filterData'
import { setFilterGlint } from './filterGlint'

const MAX_LORE_LINE_LENGTH = 50 as const
const BLANK_LORE_LINE = ' ' as const
const LORE_INSERT_1 = '§7Insert this filter into' as const
const LORE_INSERT_2 = '§7a pylon to use it!' as const
const LORE_USED_INTERDICTION = '§7Used in the Interdiction Pylon.' as const
const LORE_USED_PROTECTION = '§7Used in the Protection Pylon.' as const
const LORE_USED_EXPULSION = '§7Used in the Expulsion Pylon.' as const
const LORE_USED_INFUSION = '§7Used in the Infusion Pylon.' as const

type LoreLine = RawMessage | string

const clampLoreLine = (line: string): string =>
    line.length <= MAX_LORE_LINE_LENGTH ? line : `${line.slice(0, MAX_LORE_LINE_LENGTH - 3)}...`

export const formatIdentifierName = (typeId: string): string => {
    const colon = typeId.indexOf(':')
    const rawName = colon >= 0 ? typeId.slice(colon + 1) : typeId
    return rawName
        .split('_')
        .filter(part => part.length > 0)
        .map(part => part[0].toUpperCase() + part.slice(1))
        .join(' ')
}

export const formatEffectDisplayName = (
    displayName: string,
    effectTypeId: string,
    amplifier: number,
): string => {
    const trimmed = displayName.trim()
    const base = trimmed.length > 0 ? trimmed : formatIdentifierName(effectTypeId)
    if (amplifier <= 0) return base
    const roman = formatRomanLevel(amplifier + 1)
    const numeric = String(amplifier + 1)
    if (base.endsWith(` ${roman}`) || base.endsWith(` ${numeric}`)) return base
    return `${base} ${roman}`
}

const buildTranslatedTargetLine = (
    localizationKey: string,
    fallbackTypeId: string,
    preferLiteral: boolean,
): LoreLine => {
    if (!preferLiteral && localizationKey.length > 0) {
        return { rawtext: [{ text: '§9' }, { translate: localizationKey }] }
    }
    return clampLoreLine(`§9${formatIdentifierName(fallbackTypeId)}`)
}

const buildMobFilterLore = (itemStack: ItemStack, preferLiteral: boolean): LoreLine[] => {
    const payload = readMobFilter(itemStack)
    if (!payload) {
        return [
            '§7Right-click on a mob to select it.',
            BLANK_LORE_LINE,
            LORE_USED_INTERDICTION,
            LORE_USED_PROTECTION,
        ]
    }
    return [
        buildTranslatedTargetLine(payload.localizationKey, payload.entityTypeId, preferLiteral),
        BLANK_LORE_LINE,
        LORE_INSERT_1,
        LORE_INSERT_2,
        BLANK_LORE_LINE,
        LORE_USED_INTERDICTION,
        LORE_USED_PROTECTION,
    ]
}

const buildPlayerFilterLore = (itemStack: ItemStack): LoreLine[] => {
    const payload = readPlayerFilter(itemStack)
    if (!payload) {
        return [
            '§7Right-click on a player to select them.',
            BLANK_LORE_LINE,
            LORE_USED_EXPULSION,
        ]
    }
    return [
        clampLoreLine(`§9Player: ${payload.playerName}`),
        BLANK_LORE_LINE,
        LORE_INSERT_1,
        LORE_INSERT_2,
        BLANK_LORE_LINE,
        LORE_USED_EXPULSION,
    ]
}

const buildBlockFilterLore = (itemStack: ItemStack, preferLiteral: boolean): LoreLine[] => {
    const payload = readBlockFilter(itemStack)
    if (!payload) {
        return [
            '§7Right-click on a block to select it.',
            BLANK_LORE_LINE,
            LORE_USED_PROTECTION,
        ]
    }
    return [
        buildTranslatedTargetLine(payload.localizationKey, payload.blockTypeId, preferLiteral),
        BLANK_LORE_LINE,
        LORE_INSERT_1,
        LORE_INSERT_2,
        BLANK_LORE_LINE,
        LORE_USED_PROTECTION,
    ]
}

const buildLifelessFilterLore = (): LoreLine[] => [
    '§2Disables natural spawns in range.',
    '§2Increases range to 25x25 chunks.',
    '§4Disables other mob filters.',
    BLANK_LORE_LINE,
    LORE_USED_INTERDICTION,
]

const buildPotionFilterLore = (itemStack: ItemStack): LoreLine[] => {
    const payload = readPotionFilter(itemStack)
    if (!payload) {
        return [
            '§7Right-click with an active effect',
            '§7to apply it to the card.',
            clampLoreLine(`§7Minimum effect duration: ${POTION_FILTER_CONFIG.minimumDurationSeconds} seconds`),
            BLANK_LORE_LINE,
            LORE_USED_INFUSION,
        ]
    }

    const lines: LoreLine[] = []
    const color = isHarmfulEffect(payload.effectTypeId) ? '§c' : '§9'
    const effectTitle = formatEffectDisplayName(payload.displayName, payload.effectTypeId, payload.amplifier)
    lines.push(clampLoreLine(`${color}${effectTitle}`))

    if (!isEffectAllowed(payload.effectTypeId)) {
        lines.push('§cEffect is disabled in the config.')
    }
    if (isPotionPotencyCapped(payload.amplifier)) {
        const capLevel = formatRomanLevel(POTION_FILTER_CONFIG.maximumPotency + 1)
        lines.push(clampLoreLine(`§eCapped at level ${capLevel}`))
    }

    lines.push(BLANK_LORE_LINE)
    if (payload.durationTicks >= REQUIRED_EFFECT_TICKS) {
        lines.push(LORE_INSERT_1, LORE_INSERT_2, '§aActivated')
    } else {
        const seconds = Math.floor(payload.durationTicks / TICKS_PER_SECOND)
        lines.push(
            '§7Right-click with the same effect',
            '§7active to increase progress.',
            clampLoreLine(`§7Progress: ${seconds}/${POTION_FILTER_CONFIG.requiredDurationSeconds} seconds`),
        )
    }

    lines.push(BLANK_LORE_LINE, LORE_USED_INFUSION)
    return lines
}

const buildFilterLore = (itemStack: ItemStack, preferLiteral = false): LoreLine[] | undefined => {
    switch (itemStack.typeId) {
        case ITEM_IDS.mobFilter:
            return buildMobFilterLore(itemStack, preferLiteral)
        case ITEM_IDS.playerFilter:
            return buildPlayerFilterLore(itemStack)
        case ITEM_IDS.blockFilter:
            return buildBlockFilterLore(itemStack, preferLiteral)
        case ITEM_IDS.lifelessFilter:
            return buildLifelessFilterLore()
        case ITEM_IDS.potionFilter:
            return buildPotionFilterLore(itemStack)
        default:
            return undefined
    }
}

export const applyFilterLore = (itemStack: ItemStack): void => {
    const lore = buildFilterLore(itemStack, false)
    if (!lore) return
    try {
        itemStack.setLore(lore)
    } catch {
        const fallbackLore = buildFilterLore(itemStack, true)
        if (fallbackLore) itemStack.setLore(fallbackLore)
    }
}

const resolveUnloredFilterSlot = (
    container: Container,
    slot: number,
    inventoryType: PlayerInventoryType,
    typeId: string,
): number | undefined => {
    if (slot >= 0 && slot < container.size) {
        const direct = container.getItem(slot)
        if (direct?.typeId === typeId && direct.getLore().length === 0) return slot
    }
    if (inventoryType === PlayerInventoryType.Inventory) {
        const offsetSlot = slot + 9
        if (offsetSlot >= 0 && offsetSlot < container.size) {
            const offsetItem = container.getItem(offsetSlot)
            if (offsetItem?.typeId === typeId && offsetItem.getLore().length === 0) return offsetSlot
        }
    }
    return undefined
}

export const ensureFilterLoreInSlot = (
    player: Player,
    slot: number,
    inventoryType: PlayerInventoryType,
    itemStack: ItemStack,
): void => {
    if (!player.isValid || !isFilterItemTypeId(itemStack.typeId)) return
    if (itemStack.getLore().length > 0) return

    const container = player.getComponent(EntityComponentTypes.Inventory)?.container
    if (!container) return

    const targetSlot = resolveUnloredFilterSlot(container, slot, inventoryType, itemStack.typeId)
    if (targetSlot === undefined) return

    const stored = container.getItem(targetSlot)
    if (!stored || stored.typeId !== itemStack.typeId || stored.getLore().length > 0) return

    applyFilterLore(stored)
    setFilterGlint(stored, hasCapturedFilterData(stored))
    container.setItem(targetSlot, stored)
}
