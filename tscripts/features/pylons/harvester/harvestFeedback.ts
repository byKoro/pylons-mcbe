import type { Dimension, Vector3 } from '@minecraft/server'
import { HARVESTER_PYLON_CONFIG } from './config'

const blockCenter = (location: Vector3): Vector3 => ({
    x: location.x + 0.5,
    y: location.y + 0.5,
    z: location.z + 0.5,
})

export const playHarvestFeedback = (dimension: Dimension, harvestedLocations: readonly Vector3[]): void => {
    const first = harvestedLocations[0]
    if (!first) return

    for (const location of harvestedLocations) {
        dimension.spawnParticle(HARVESTER_PYLON_CONFIG.harvestParticleId, blockCenter(location))
    }

    dimension.playSound(HARVESTER_PYLON_CONFIG.harvestSoundId, blockCenter(first), {
        volume: HARVESTER_PYLON_CONFIG.harvestSoundVolume,
        pitch: HARVESTER_PYLON_CONFIG.harvestSoundPitch,
    })
}
