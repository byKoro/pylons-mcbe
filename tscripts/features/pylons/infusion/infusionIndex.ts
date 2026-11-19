import { world, type Entity } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS } from '../../../shared/identifiers'
import type { InfusionEffect } from './infusionEffects'

export interface InfusionSource {
    readonly ownerId: string
    readonly effects: readonly InfusionEffect[]
}

let indexEntries: Map<string, InfusionSource> | undefined
let lastSerialized = ''

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const parseEffect = (value: unknown): InfusionEffect | undefined => {
    if (!isRecord(value)) return undefined
    if (typeof value.effectTypeId !== 'string' || value.effectTypeId.length === 0) return undefined
    if (
        typeof value.amplifier !== 'number' ||
        !Number.isInteger(value.amplifier) ||
        value.amplifier < 0 ||
        value.amplifier > 255
    ) {
        return undefined
    }
    return {
        effectTypeId: value.effectTypeId,
        amplifier: value.amplifier,
    }
}

const parseSource = (value: unknown): InfusionSource | undefined => {
    if (!isRecord(value)) return undefined
    if (typeof value.ownerId !== 'string' || value.ownerId.length === 0) return undefined
    if (!Array.isArray(value.effects)) return undefined
    const effects: InfusionEffect[] = []
    for (const rawEffect of value.effects) {
        const effect = parseEffect(rawEffect)
        if (effect) effects.push(effect)
    }
    if (effects.length === 0) return undefined
    return {
        ownerId: value.ownerId,
        effects,
    }
}

const loadIndex = (): Map<string, InfusionSource> => {
    const entries = new Map<string, InfusionSource>()
    const raw = world.getDynamicProperty(DYNAMIC_PROPERTY_IDS.infusionIndex)
    if (typeof raw !== 'string') {
        lastSerialized = ''
        return entries
    }
    lastSerialized = raw
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return entries
    }
    if (!isRecord(parsed)) return entries
    for (const [key, value] of Object.entries(parsed)) {
        if (key.length === 0) continue
        const source = parseSource(value)
        if (source) entries.set(key, source)
    }
    return entries
}

const ensureIndex = (): Map<string, InfusionSource> => {
    if (!indexEntries) indexEntries = loadIndex()
    return indexEntries
}

const sourcesEqual = (a: InfusionSource, b: InfusionSource): boolean => {
    if (a.ownerId !== b.ownerId || a.effects.length !== b.effects.length) return false
    for (let index = 0; index < a.effects.length; index++) {
        const left = a.effects[index]
        const right = b.effects[index]
        if (!left || !right || left.effectTypeId !== right.effectTypeId || left.amplifier !== right.amplifier) {
            return false
        }
    }
    return true
}

const persistIndex = (entries: Map<string, InfusionSource>): void => {
    const serialized = JSON.stringify(Object.fromEntries(entries))
    if (serialized === lastSerialized) return
    world.setDynamicProperty(DYNAMIC_PROPERTY_IDS.infusionIndex, serialized)
    lastSerialized = serialized
}

export const toInfusionSourceKey = (entity: Entity): string => {
    const { dimension, location } = entity
    return `${dimension.id}|${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`
}

export const getInfusionIndex = (): ReadonlyMap<string, InfusionSource> => ensureIndex()

export const setInfusionSource = (key: string, source: InfusionSource): void => {
    const entries = ensureIndex()
    const existing = entries.get(key)
    if (existing && sourcesEqual(existing, source)) return
    entries.set(key, source)
    persistIndex(entries)
}

export const removeInfusionSource = (key: string): void => {
    const entries = ensureIndex()
    if (!entries.delete(key)) return
    persistIndex(entries)
}
