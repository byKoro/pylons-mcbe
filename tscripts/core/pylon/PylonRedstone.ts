import type { Block } from '@minecraft/server'

const neighborPower = (readNeighbor: () => Block | undefined): number => {
    try {
        return readNeighbor()?.getRedstonePower() ?? 0
    } catch {
        return 0
    }
}

export const isPylonRedstonePowered = (block: Block): boolean =>
    neighborPower(() => block.above()) > 0 ||
    neighborPower(() => block.below()) > 0 ||
    neighborPower(() => block.north()) > 0 ||
    neighborPower(() => block.south()) > 0 ||
    neighborPower(() => block.east()) > 0 ||
    neighborPower(() => block.west()) > 0
