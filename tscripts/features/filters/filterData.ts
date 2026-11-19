import type { ItemStack } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS, ITEM_IDS } from '../../shared/identifiers'
import { POTION_FILTER_CONFIG } from './config'
import { setFilterGlint } from './filterGlint'
import type {
    BlockFilterPayload,
    FilterPayload,
    LifelessFilterPayload,
    MobFilterPayload,
    PlayerFilterPayload,
    PotionFilterPayload,
} from './types'

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

const HARMFUL_EFFECT_IDS = new Set<string>([
    'minecraft:bad_omen',
    'minecraft:blindness',
    'minecraft:darkness',
    'minecraft:fatal_poison',
    'minecraft:hunger',
    'minecraft:infested',
    'minecraft:instant_damage',
    'minecraft:levitation',
    'minecraft:mining_fatigue',
    'minecraft:nausea',
    'minecraft:oozing',
    'minecraft:poison',
    'minecraft:raid_omen',
    'minecraft:slowness',
    'minecraft:trial_omen',
    'minecraft:weakness',
    'minecraft:weaving',
    'minecraft:wind_charged',
    'minecraft:wither',
])

const ALLOWED_EFFECT_SET = new Set<string>(POTION_FILTER_CONFIG.allowedEffects)
const DENIED_EFFECT_SET = new Set<string>(POTION_FILTER_CONFIG.deniedEffects)

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const parseStoredJson = (itemStack: ItemStack): Record<string, unknown> | undefined => {
    const raw = itemStack.getDynamicProperty(DYNAMIC_PROPERTY_IDS.filterData)
    if (typeof raw !== 'string') return undefined
    try {
        const parsed: unknown = JSON.parse(raw)
        return isRecord(parsed) ? parsed : undefined
    } catch {
        return undefined
    }
}

export const normalizeEffectId = (typeId: string): string =>
    typeId.includes(':') ? typeId : `minecraft:${typeId}`

const effectNamespace = (normalizedId: string): string => {
    const colon = normalizedId.indexOf(':')
    return colon >= 0 ? normalizedId.slice(0, colon) : 'minecraft'
}

export const isEffectAllowed = (effectTypeId: string): boolean => {
    const normalized = normalizeEffectId(effectTypeId)
    const namespace = effectNamespace(normalized)
    if (DENIED_EFFECT_SET.has(normalized) || DENIED_EFFECT_SET.has(namespace)) return false
    if (ALLOWED_EFFECT_SET.size === 0) return true
    return ALLOWED_EFFECT_SET.has(normalized) || ALLOWED_EFFECT_SET.has(namespace)
}

export const isPotionPotencyCapped = (amplifier: number): boolean =>
    amplifier > POTION_FILTER_CONFIG.maximumPotency

export const isHarmfulEffect = (effectTypeId: string): boolean =>
    HARMFUL_EFFECT_IDS.has(normalizeEffectId(effectTypeId))

export const formatRomanLevel = (level: number): string => {
    if (level >= 1 && level < ROMAN_NUMERALS.length) {
        return ROMAN_NUMERALS[level] ?? String(level)
    }
    return String(level)
}

export const isClearableFilterTypeId = (typeId: string): boolean =>
    typeId === ITEM_IDS.mobFilter ||
    typeId === ITEM_IDS.playerFilter ||
    typeId === ITEM_IDS.blockFilter ||
    typeId === ITEM_IDS.potionFilter

export const readMobFilter = (itemStack: ItemStack): MobFilterPayload | undefined => {
    if (itemStack.typeId !== ITEM_IDS.mobFilter) return undefined
    const parsed = parseStoredJson(itemStack)
    if (!parsed || parsed.kind !== 'mob') return undefined
    if (typeof parsed.entityTypeId !== 'string' || parsed.entityTypeId.length === 0) return undefined
    if (typeof parsed.localizationKey !== 'string') return undefined
    return {
        kind: 'mob',
        entityTypeId: parsed.entityTypeId,
        localizationKey: parsed.localizationKey,
    }
}

export const readPlayerFilter = (itemStack: ItemStack): PlayerFilterPayload | undefined => {
    if (itemStack.typeId !== ITEM_IDS.playerFilter) return undefined
    const parsed = parseStoredJson(itemStack)
    if (!parsed || parsed.kind !== 'player') return undefined
    if (typeof parsed.playerId !== 'string' || parsed.playerId.length === 0) return undefined
    if (typeof parsed.playerName !== 'string' || parsed.playerName.length === 0) return undefined
    return {
        kind: 'player',
        playerId: parsed.playerId,
        playerName: parsed.playerName,
    }
}

export const readBlockFilter = (itemStack: ItemStack): BlockFilterPayload | undefined => {
    if (itemStack.typeId !== ITEM_IDS.blockFilter) return undefined
    const parsed = parseStoredJson(itemStack)
    if (!parsed || parsed.kind !== 'block') return undefined
    if (typeof parsed.blockTypeId !== 'string' || parsed.blockTypeId.length === 0) return undefined
    if (typeof parsed.localizationKey !== 'string') return undefined
    return {
        kind: 'block',
        blockTypeId: parsed.blockTypeId,
        localizationKey: parsed.localizationKey,
    }
}

export const readPotionFilter = (itemStack: ItemStack): PotionFilterPayload | undefined => {
    if (itemStack.typeId !== ITEM_IDS.potionFilter) return undefined
    const parsed = parseStoredJson(itemStack)
    if (!parsed || parsed.kind !== 'potion') return undefined
    if (typeof parsed.effectTypeId !== 'string' || parsed.effectTypeId.length === 0) return undefined
    if (typeof parsed.amplifier !== 'number' || !Number.isInteger(parsed.amplifier) || parsed.amplifier < 0) {
        return undefined
    }
    if (typeof parsed.durationTicks !== 'number' || !Number.isFinite(parsed.durationTicks) || parsed.durationTicks <= 0) {
        return undefined
    }
    if (typeof parsed.displayName !== 'string') return undefined
    return {
        kind: 'potion',
        effectTypeId: normalizeEffectId(parsed.effectTypeId),
        amplifier: Math.min(255, parsed.amplifier),
        durationTicks: Math.floor(parsed.durationTicks),
        displayName: parsed.displayName,
    }
}

export const readFilterPayload = (itemStack: ItemStack): FilterPayload | undefined => {
    switch (itemStack.typeId) {
        case ITEM_IDS.mobFilter:
            return readMobFilter(itemStack)
        case ITEM_IDS.playerFilter:
            return readPlayerFilter(itemStack)
        case ITEM_IDS.blockFilter:
            return readBlockFilter(itemStack)
        case ITEM_IDS.lifelessFilter:
            return { kind: 'lifeless' }
        case ITEM_IDS.potionFilter:
            return readPotionFilter(itemStack)
        default:
            return undefined
    }
}

export const hasCapturedFilterData = (itemStack: ItemStack): boolean =>
    isClearableFilterTypeId(itemStack.typeId) && readFilterPayload(itemStack) !== undefined

export const writeFilterPayload = (
    itemStack: ItemStack,
    payload: Exclude<FilterPayload, LifelessFilterPayload>,
): void => {
    itemStack.setDynamicProperty(DYNAMIC_PROPERTY_IDS.filterData, JSON.stringify(payload))
    setFilterGlint(itemStack, true)
}

export const clearFilterPayload = (itemStack: ItemStack): void => {
    itemStack.setDynamicProperty(DYNAMIC_PROPERTY_IDS.filterData, undefined)
    setFilterGlint(itemStack, false)
}
