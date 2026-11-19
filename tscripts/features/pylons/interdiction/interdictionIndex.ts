import { world, type Vector3 } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS } from '../../../shared/identifiers'
import { INTERDICTION_PYLON_CONFIG } from './config'

export interface InterdictionSource {
    readonly dimensionId: string
    readonly chunkX: number
    readonly chunkZ: number
    readonly chunkRadius: number
    readonly lifeless: boolean
    readonly mobIds: readonly string[]
}

let indexEntries: Map<string, InterdictionSource> | undefined
let lastSerialized = ''
const lifelessChunks = new Set<string>()
const blockedMobsByChunk = new Map<string, Set<string>>()

export const toChunkCoord = (coord: number): number => Math.floor(coord / 16)

export const toInterdictionSourceKey = (dimensionId: string, origin: Vector3): string =>
    `${dimensionId}|${Math.floor(origin.x)},${Math.floor(origin.y)},${Math.floor(origin.z)}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const parseStringIds = (value: unknown): readonly string[] | undefined => {
    if (!Array.isArray(value)) return undefined
    const ids: string[] = []
    for (const item of value) {
        if (typeof item !== 'string' || item.length === 0) return undefined
        ids.push(item)
    }
    return ids
}

const parseSource = (value: unknown): InterdictionSource | undefined => {
    if (!isRecord(value)) return undefined
    if (typeof value.dimensionId !== 'string' || value.dimensionId.length === 0) return undefined
    if (typeof value.chunkX !== 'number' || !Number.isInteger(value.chunkX)) return undefined
    if (typeof value.chunkZ !== 'number' || !Number.isInteger(value.chunkZ)) return undefined
    if (typeof value.lifeless !== 'boolean') return undefined

    const mobIds = parseStringIds(value.mobIds)
    if (!mobIds) return undefined

    if (value.lifeless) {
        if (value.chunkRadius !== INTERDICTION_PYLON_CONFIG.lifelessChunkRadius) return undefined
        if (mobIds.length !== 0) return undefined
        return {
            dimensionId: value.dimensionId,
            chunkX: value.chunkX,
            chunkZ: value.chunkZ,
            chunkRadius: value.chunkRadius,
            lifeless: true,
            mobIds,
        }
    }

    if (
        typeof value.chunkRadius !== 'number' ||
        !Number.isInteger(value.chunkRadius) ||
        value.chunkRadius < 0 ||
        value.chunkRadius > 2
    ) {
        return undefined
    }
    if (mobIds.length === 0) return undefined

    return {
        dimensionId: value.dimensionId,
        chunkX: value.chunkX,
        chunkZ: value.chunkZ,
        chunkRadius: value.chunkRadius,
        lifeless: false,
        mobIds,
    }
}

const addMobRulesForChunk = (chunkKey: string, mobIds: readonly string[]): void => {
    let mobSet = blockedMobsByChunk.get(chunkKey)
    if (!mobSet) {
        mobSet = new Set<string>()
        blockedMobsByChunk.set(chunkKey, mobSet)
    }
    for (const mobId of mobIds) {
        mobSet.add(mobId)
    }
}

const rebuildChunkLookup = (entries: Map<string, InterdictionSource>): void => {
    lifelessChunks.clear()
    blockedMobsByChunk.clear()
    for (const source of entries.values()) {
        for (let dx = -source.chunkRadius; dx <= source.chunkRadius; dx++) {
            for (let dz = -source.chunkRadius; dz <= source.chunkRadius; dz++) {
                const chunkKey = `${source.dimensionId}|${source.chunkX + dx},${source.chunkZ + dz}`
                if (source.lifeless) {
                    lifelessChunks.add(chunkKey)
                    continue
                }
                addMobRulesForChunk(chunkKey, source.mobIds)
            }
        }
    }
}

const loadIndex = (): Map<string, InterdictionSource> => {
    const entries = new Map<string, InterdictionSource>()
    const raw = world.getDynamicProperty(DYNAMIC_PROPERTY_IDS.interdictionIndex)
    if (typeof raw !== 'string') {
        lastSerialized = ''
        rebuildChunkLookup(entries)
        return entries
    }
    lastSerialized = raw
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        rebuildChunkLookup(entries)
        return entries
    }
    if (!isRecord(parsed)) {
        rebuildChunkLookup(entries)
        return entries
    }
    for (const [key, value] of Object.entries(parsed)) {
        if (key.length === 0) continue
        const source = parseSource(value)
        if (source) entries.set(key, source)
    }
    rebuildChunkLookup(entries)
    return entries
}

const ensureIndex = (): Map<string, InterdictionSource> => {
    if (!indexEntries) indexEntries = loadIndex()
    return indexEntries
}

const stringArraysEqual = (a: readonly string[], b: readonly string[]): boolean => {
    if (a.length !== b.length) return false
    for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) return false
    }
    return true
}

const sourcesEqual = (a: InterdictionSource, b: InterdictionSource): boolean =>
    a.dimensionId === b.dimensionId &&
    a.chunkX === b.chunkX &&
    a.chunkZ === b.chunkZ &&
    a.chunkRadius === b.chunkRadius &&
    a.lifeless === b.lifeless &&
    stringArraysEqual(a.mobIds, b.mobIds)

const persistIndex = (entries: Map<string, InterdictionSource>): void => {
    const serialized = JSON.stringify(Object.fromEntries(entries))
    if (serialized === lastSerialized) return
    world.setDynamicProperty(DYNAMIC_PROPERTY_IDS.interdictionIndex, serialized)
    lastSerialized = serialized
}

export const setInterdictionSource = (key: string, source: InterdictionSource): void => {
    const entries = ensureIndex()
    const existing = entries.get(key)
    if (existing && sourcesEqual(existing, source)) return
    entries.set(key, source)
    rebuildChunkLookup(entries)
    persistIndex(entries)
}

export const removeInterdictionSource = (key: string): void => {
    const entries = ensureIndex()
    if (!entries.delete(key)) return
    rebuildChunkLookup(entries)
    persistIndex(entries)
}

export const hasActiveInterdiction = (): boolean => {
    ensureIndex()
    return lifelessChunks.size > 0 || blockedMobsByChunk.size > 0
}

export const isMobBlockedInChunk = (
    dimensionId: string,
    chunkX: number,
    chunkZ: number,
    entityTypeId: string,
): boolean => {
    ensureIndex()
    if (blockedMobsByChunk.size === 0) return false
    return blockedMobsByChunk.get(`${dimensionId}|${chunkX},${chunkZ}`)?.has(entityTypeId) === true
}

export const isChunkLifeless = (
    dimensionId: string,
    chunkX: number,
    chunkZ: number,
): boolean => {
    ensureIndex()
    if (lifelessChunks.size === 0) return false
    return lifelessChunks.has(`${dimensionId}|${chunkX},${chunkZ}`)
}
