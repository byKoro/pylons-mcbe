import { world, type Vector3 } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS } from '../../../shared/identifiers'

export interface ProtectionSource {
    readonly ownerId: string
    readonly dimensionId: string
    readonly chunkX: number
    readonly chunkZ: number
    readonly chunkRadius: number
    readonly blockIds: readonly string[]
    readonly mobIds: readonly string[]
}

let indexEntries: Map<string, ProtectionSource> | undefined
let lastSerialized = ''
const blockRulesByChunk = new Map<string, Map<string, Set<string>>>()
const mobRulesByChunk = new Map<string, Map<string, Set<string>>>()

export const toChunkCoord = (coord: number): number => Math.floor(coord / 16)

export const toProtectionSourceKey = (dimensionId: string, origin: Vector3): string =>
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

const parseSource = (value: unknown): ProtectionSource | undefined => {
    if (!isRecord(value)) return undefined
    if (typeof value.ownerId !== 'string' || value.ownerId.length === 0) return undefined
    if (typeof value.dimensionId !== 'string' || value.dimensionId.length === 0) return undefined
    if (typeof value.chunkX !== 'number' || !Number.isInteger(value.chunkX)) return undefined
    if (typeof value.chunkZ !== 'number' || !Number.isInteger(value.chunkZ)) return undefined
    if (
        typeof value.chunkRadius !== 'number' ||
        !Number.isInteger(value.chunkRadius) ||
        value.chunkRadius < 0 ||
        value.chunkRadius > 2
    ) {
        return undefined
    }

    const blockIds = parseStringIds(value.blockIds)
    const mobIds = parseStringIds(value.mobIds)
    if (!blockIds || !mobIds) return undefined
    if (blockIds.length === 0 && mobIds.length === 0) return undefined

    return {
        ownerId: value.ownerId,
        dimensionId: value.dimensionId,
        chunkX: value.chunkX,
        chunkZ: value.chunkZ,
        chunkRadius: value.chunkRadius,
        blockIds,
        mobIds,
    }
}

const addRulesForChunk = (
    target: Map<string, Map<string, Set<string>>>,
    chunkKey: string,
    ownerId: string,
    ids: readonly string[],
): void => {
    if (ids.length === 0) return
    let ownerMap = target.get(chunkKey)
    if (!ownerMap) {
        ownerMap = new Map<string, Set<string>>()
        target.set(chunkKey, ownerMap)
    }
    let idSet = ownerMap.get(ownerId)
    if (!idSet) {
        idSet = new Set<string>()
        ownerMap.set(ownerId, idSet)
    }
    for (const id of ids) {
        idSet.add(id)
    }
}

const rebuildChunkLookup = (entries: Map<string, ProtectionSource>): void => {
    blockRulesByChunk.clear()
    mobRulesByChunk.clear()
    for (const source of entries.values()) {
        for (let dx = -source.chunkRadius; dx <= source.chunkRadius; dx++) {
            for (let dz = -source.chunkRadius; dz <= source.chunkRadius; dz++) {
                const chunkKey = `${source.dimensionId}|${source.chunkX + dx},${source.chunkZ + dz}`
                addRulesForChunk(blockRulesByChunk, chunkKey, source.ownerId, source.blockIds)
                addRulesForChunk(mobRulesByChunk, chunkKey, source.ownerId, source.mobIds)
            }
        }
    }
}

const loadIndex = (): Map<string, ProtectionSource> => {
    const entries = new Map<string, ProtectionSource>()
    const raw = world.getDynamicProperty(DYNAMIC_PROPERTY_IDS.protectionIndex)
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

const ensureIndex = (): Map<string, ProtectionSource> => {
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

const sourcesEqual = (a: ProtectionSource, b: ProtectionSource): boolean =>
    a.ownerId === b.ownerId &&
    a.dimensionId === b.dimensionId &&
    a.chunkX === b.chunkX &&
    a.chunkZ === b.chunkZ &&
    a.chunkRadius === b.chunkRadius &&
    stringArraysEqual(a.blockIds, b.blockIds) &&
    stringArraysEqual(a.mobIds, b.mobIds)

const persistIndex = (entries: Map<string, ProtectionSource>): void => {
    const serialized = JSON.stringify(Object.fromEntries(entries))
    if (serialized === lastSerialized) return
    world.setDynamicProperty(DYNAMIC_PROPERTY_IDS.protectionIndex, serialized)
    lastSerialized = serialized
}

export const setProtectionSource = (key: string, source: ProtectionSource): void => {
    const entries = ensureIndex()
    const existing = entries.get(key)
    if (existing && sourcesEqual(existing, source)) return
    entries.set(key, source)
    rebuildChunkLookup(entries)
    persistIndex(entries)
}

export const removeProtectionSource = (key: string): void => {
    const entries = ensureIndex()
    if (!entries.delete(key)) return
    rebuildChunkLookup(entries)
    persistIndex(entries)
}

export const isBlockProtected = (
    dimensionId: string,
    location: Vector3,
    ownerId: string,
    blockTypeId: string,
): boolean => {
    ensureIndex()
    if (blockRulesByChunk.size === 0) return false
    const chunkKey = `${dimensionId}|${toChunkCoord(location.x)},${toChunkCoord(location.z)}`
    return blockRulesByChunk.get(chunkKey)?.get(ownerId)?.has(blockTypeId) === true
}

export const isMobProtected = (
    dimensionId: string,
    location: Vector3,
    ownerId: string,
    entityTypeId: string,
): boolean => {
    ensureIndex()
    if (mobRulesByChunk.size === 0) return false
    const chunkKey = `${dimensionId}|${toChunkCoord(location.x)},${toChunkCoord(location.z)}`
    return mobRulesByChunk.get(chunkKey)?.get(ownerId)?.has(entityTypeId) === true
}
