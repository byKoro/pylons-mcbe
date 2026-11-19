import { world, type Vector3 } from '@minecraft/server'
import { DYNAMIC_PROPERTY_IDS } from '../../../shared/identifiers'

export interface ExpulsionSource {
    readonly ownerId: string
    readonly ownerName: string
    readonly dimensionId: string
    readonly chunkX: number
    readonly chunkZ: number
    readonly chunkRadius: number
    readonly allowedPlayerIds: readonly string[]
}

let indexEntries: Map<string, ExpulsionSource> | undefined
let lastSerialized = ''
const sourcesByChunk = new Map<string, ExpulsionSource[]>()

export const toChunkCoord = (coord: number): number => Math.floor(coord) >> 4

export const toExpulsionSourceKey = (dimensionId: string, location: Vector3): string =>
    `${dimensionId}|${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`

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

const parseSource = (value: unknown): ExpulsionSource | undefined => {
    if (!isRecord(value)) return undefined
    if (typeof value.ownerId !== 'string' || value.ownerId.length === 0) return undefined
    if (typeof value.ownerName !== 'string') return undefined
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

    const allowedPlayerIds = parseStringIds(value.allowedPlayerIds)
    if (!allowedPlayerIds) return undefined

    return {
        ownerId: value.ownerId,
        ownerName: value.ownerName,
        dimensionId: value.dimensionId,
        chunkX: value.chunkX,
        chunkZ: value.chunkZ,
        chunkRadius: value.chunkRadius,
        allowedPlayerIds,
    }
}

const rebuildChunkLookup = (entries: Map<string, ExpulsionSource>): void => {
    sourcesByChunk.clear()
    for (const source of entries.values()) {
        for (let dx = -source.chunkRadius; dx <= source.chunkRadius; dx++) {
            for (let dz = -source.chunkRadius; dz <= source.chunkRadius; dz++) {
                const chunkKey = `${source.dimensionId}|${source.chunkX + dx},${source.chunkZ + dz}`
                let list = sourcesByChunk.get(chunkKey)
                if (!list) {
                    list = []
                    sourcesByChunk.set(chunkKey, list)
                }
                list.push(source)
            }
        }
    }
}

const loadIndex = (): Map<string, ExpulsionSource> => {
    const entries = new Map<string, ExpulsionSource>()
    const raw = world.getDynamicProperty(DYNAMIC_PROPERTY_IDS.expulsionIndex)
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

const ensureIndex = (): Map<string, ExpulsionSource> => {
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

const sourcesEqual = (a: ExpulsionSource, b: ExpulsionSource): boolean =>
    a.ownerId === b.ownerId &&
    a.ownerName === b.ownerName &&
    a.dimensionId === b.dimensionId &&
    a.chunkX === b.chunkX &&
    a.chunkZ === b.chunkZ &&
    a.chunkRadius === b.chunkRadius &&
    stringArraysEqual(a.allowedPlayerIds, b.allowedPlayerIds)

const persistIndex = (entries: Map<string, ExpulsionSource>): void => {
    const serialized = JSON.stringify(Object.fromEntries(entries))
    if (serialized === lastSerialized) return
    world.setDynamicProperty(DYNAMIC_PROPERTY_IDS.expulsionIndex, serialized)
    lastSerialized = serialized
}

export const hasActiveExpulsion = (): boolean => {
    ensureIndex()
    return sourcesByChunk.size > 0
}

export const getExpulsionSourcesForChunk = (
    dimensionId: string,
    chunkX: number,
    chunkZ: number,
): readonly ExpulsionSource[] | undefined => {
    ensureIndex()
    if (sourcesByChunk.size === 0) return undefined
    return sourcesByChunk.get(`${dimensionId}|${chunkX},${chunkZ}`)
}

export const setExpulsionSource = (key: string, source: ExpulsionSource): void => {
    const entries = ensureIndex()
    const existing = entries.get(key)
    if (existing && sourcesEqual(existing, source)) return
    entries.set(key, source)
    rebuildChunkLookup(entries)
    persistIndex(entries)
}

export const removeExpulsionSource = (key: string): void => {
    const entries = ensureIndex()
    if (!entries.delete(key)) return
    rebuildChunkLookup(entries)
    persistIndex(entries)
}
