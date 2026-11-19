import { world, type Block, type Dimension, type DimensionLocation, type Player } from '@minecraft/server'
import { describeError } from '../../../shared/errors'
import { logWarn } from '../../../shared/log'
import { isOperator } from '../../../shared/permissions'
import { EXPULSION_PYLON_CONFIG } from './config'
import {
    getExpulsionSourcesForChunk,
    hasActiveExpulsion,
    toChunkCoord,
    type ExpulsionSource,
} from './expulsionIndex'

interface PendingSpawnSettle {
    readonly x: number
    readonly z: number
    readonly nextTick: number
    readonly attemptsLeft: number
}

const lastMessageTickByPlayer = new Map<string, number>()
const pendingSpawnSettles = new Map<string, PendingSpawnSettle>()

const safeGetSpawnPoint = (player: Player): DimensionLocation | undefined => {
    try {
        return player.getSpawnPoint()
    } catch {
        return undefined
    }
}

const safeTryTeleport = (player: Player, spawnPoint: DimensionLocation): boolean => {
    try {
        return player.tryTeleport(
            { x: spawnPoint.x + 0.5, y: spawnPoint.y, z: spawnPoint.z + 0.5 },
            { dimension: spawnPoint.dimension, checkForBlocks: true, keepVelocity: false },
        )
    } catch {
        return false
    }
}

const safeGetTopmostBlock = (dimension: Dimension, x: number, z: number): Block | undefined => {
    try {
        return dimension.getTopmostBlock({ x, z })
    } catch {
        return undefined
    }
}

const isInsideSourceArea = (location: DimensionLocation, source: ExpulsionSource): boolean =>
    location.dimension.id === source.dimensionId &&
    Math.abs(toChunkCoord(location.x) - source.chunkX) <= source.chunkRadius &&
    Math.abs(toChunkCoord(location.z) - source.chunkZ) <= source.chunkRadius

const queueSpawnSettle = (playerId: string, x: number, z: number, tick: number): void => {
    pendingSpawnSettles.set(playerId, {
        x,
        z,
        nextTick: tick + EXPULSION_PYLON_CONFIG.spawnSettleIntervalTicks,
        attemptsLeft: EXPULSION_PYLON_CONFIG.spawnSettleMaxAttempts,
    })
}

const sendExpelMessage = (player: Player, source: ExpulsionSource, tick: number): void => {
    const last = lastMessageTickByPlayer.get(player.id)
    if (last !== undefined && tick - last < EXPULSION_PYLON_CONFIG.messageCooldownTicks) return
    lastMessageTickByPlayer.set(player.id, tick)
    const ownerLabel = source.ownerName || 'another player'
    player.sendMessage(`§cYou have been expelled from ${ownerLabel}'s chunk!`)
}

const expelPlayer = (player: Player, source: ExpulsionSource, tick: number): void => {
    const personalSpawn = safeGetSpawnPoint(player)
    if (personalSpawn && !isInsideSourceArea(personalSpawn, source) && safeTryTeleport(player, personalSpawn)) {
        pendingSpawnSettles.delete(player.id)
        sendExpelMessage(player, source, tick)
        return
    }

    const overworld = world.getDimension('overworld')
    const spawn = world.getDefaultSpawnLocation()
    const spawnX = Math.floor(spawn.x)
    const spawnZ = Math.floor(spawn.z)
    const { min, max } = overworld.heightRange

    try {
        if (Number.isFinite(spawn.y) && spawn.y >= min && spawn.y <= max) {
            player.teleport(
                { x: spawnX + 0.5, y: spawn.y, z: spawnZ + 0.5 },
                { dimension: overworld, keepVelocity: false },
            )
            pendingSpawnSettles.delete(player.id)
        } else if (overworld.isChunkLoaded({ x: spawnX, y: 64, z: spawnZ })) {
            const top = safeGetTopmostBlock(overworld, spawnX, spawnZ)
            if (top) {
                player.teleport(
                    { x: spawnX + 0.5, y: top.y + 1, z: spawnZ + 0.5 },
                    { dimension: overworld, keepVelocity: false },
                )
                pendingSpawnSettles.delete(player.id)
            } else {
                player.teleport(
                    { x: spawnX + 0.5, y: EXPULSION_PYLON_CONFIG.fallbackSpawnY, z: spawnZ + 0.5 },
                    { dimension: overworld, keepVelocity: false },
                )
                queueSpawnSettle(player.id, spawnX, spawnZ, tick)
            }
        } else {
            player.teleport(
                { x: spawnX + 0.5, y: EXPULSION_PYLON_CONFIG.fallbackSpawnY, z: spawnZ + 0.5 },
                { dimension: overworld, keepVelocity: false },
            )
            queueSpawnSettle(player.id, spawnX, spawnZ, tick)
        }
    } catch (error) {
        logWarn(`[Pylons:Expulsion] Failed to expel ${player.name}: ${describeError(error)}`)
        return
    }

    sendExpelMessage(player, source, tick)
}

const processPendingSpawnSettles = (tick: number, players: readonly Player[]): void => {
    const playersById = new Map<string, Player>()
    for (const player of players) {
        if (player.isValid) playersById.set(player.id, player)
    }

    const overworld = world.getDimension('overworld')
    for (const [playerId, entry] of pendingSpawnSettles) {
        if (tick < entry.nextTick) continue

        const player = playersById.get(playerId)
        if (!player) {
            pendingSpawnSettles.delete(playerId)
            continue
        }

        if (overworld.isChunkLoaded({ x: entry.x, y: 64, z: entry.z })) {
            const top = safeGetTopmostBlock(overworld, entry.x, entry.z)
            if (top) {
                try {
                    player.teleport(
                        { x: entry.x + 0.5, y: top.y + 1, z: entry.z + 0.5 },
                        { dimension: overworld, keepVelocity: false },
                    )
                } catch (error) {
                    logWarn(`[Pylons:Expulsion] Failed to settle ${player.name} at spawn: ${describeError(error)}`)
                }
                pendingSpawnSettles.delete(playerId)
                continue
            }
        }

        const remaining = entry.attemptsLeft - 1
        if (remaining <= 0) {
            pendingSpawnSettles.delete(playerId)
        } else {
            pendingSpawnSettles.set(playerId, {
                ...entry,
                nextTick: tick + EXPULSION_PYLON_CONFIG.spawnSettleIntervalTicks,
                attemptsLeft: remaining,
            })
        }
    }
}

export const tickExpulsionPlayers = (tick: number): void => {
    let players: readonly Player[] | undefined

    if (pendingSpawnSettles.size > 0) {
        let hasDueSettle = false
        for (const entry of pendingSpawnSettles.values()) {
            if (tick >= entry.nextTick) {
                hasDueSettle = true
                break
            }
        }
        if (hasDueSettle) {
            players = world.getAllPlayers()
            processPendingSpawnSettles(tick, players)
        }
    }

    if (tick % EXPULSION_PYLON_CONFIG.checkIntervalTicks !== 0) return
    if (!hasActiveExpulsion()) return

    players ??= world.getAllPlayers()
    if (players.length === 0) return

    for (const player of players) {
        if (!player.isValid) continue
        const { dimension, location } = player
        const sources = getExpulsionSourcesForChunk(
            dimension.id,
            toChunkCoord(location.x),
            toChunkCoord(location.z),
        )
        if (!sources) continue
        if (isOperator(player)) continue

        const blockingSource = sources.find(
            source => source.ownerId !== player.id && !source.allowedPlayerIds.includes(player.id),
        )
        if (blockingSource) expelPlayer(player, blockingSource, tick)
    }
}

export const clearExpulsionPlayerState = (playerId: string): void => {
    lastMessageTickByPlayer.delete(playerId)
    pendingSpawnSettles.delete(playerId)
}
