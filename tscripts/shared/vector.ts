import type { Vector3 } from '@minecraft/server'

const VIEW_DIRECTION_EPSILON = 1e-4

export const distanceSquared = (a: Vector3, b: Vector3): number => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
}

export const viewsDiffer = (a: Vector3, b: Vector3): boolean =>
    Math.abs(a.x - b.x) > VIEW_DIRECTION_EPSILON ||
    Math.abs(a.y - b.y) > VIEW_DIRECTION_EPSILON ||
    Math.abs(a.z - b.z) > VIEW_DIRECTION_EPSILON
