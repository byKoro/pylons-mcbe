import {
    BlockPermutation,
    BlockVolume,
    ItemComponentTypes,
    ListBlockVolume,
    world,
    type Block,
    type Container,
    type Dimension,
    type ItemStack,
    type ListBlockVolume as ListBlockVolumeType,
    type LootTableManager,
    type Vector3,
} from '@minecraft/server'
import type { RangeSize } from '../../../core/pylon/types'
import { safeGetBlock } from '../../../shared/world'
import { HARVESTER_PYLON_CONFIG } from './config'
import { playHarvestFeedback } from './harvestFeedback'
import { harvesterCrops, type CropStates, type HarvesterCrop } from './harvesterCrops'

export interface HarvesterPlanParams {
    readonly dimension: Dimension
    readonly origin: Vector3
    readonly rangeSize: RangeSize
    readonly hoe: ItemStack
    readonly pylonContainer: Container
    readonly toolSlot: number
    readonly outputContainer: Container
}

interface VirtualSlot {
    readonly sample: ItemStack
    amount: number
    readonly maxAmount: number
}

interface ResetBlockTarget {
    readonly location: Vector3
    readonly key: string
    readonly permutation: BlockPermutation
}

interface CropGroup {
    readonly blocks: readonly ResetBlockTarget[]
    readonly loot: readonly ItemStack[]
}

const readyPermutations = (): readonly BlockPermutation[] => harvesterCrops.getReadyPermutations()

const rangeToRadius = (rangeSize: RangeSize): number => HARVESTER_PYLON_CONFIG.rangeRadii[rangeSize]

const buildScanVolume = (origin: Vector3, radius: number): BlockVolume =>
    new BlockVolume(
        { x: origin.x - radius, y: origin.y, z: origin.z - radius },
        { x: origin.x + radius, y: origin.y, z: origin.z + radius },
    )

const canonicalPermutationKey = (typeId: string, states: CropStates): string => {
    const entries = Object.entries(states).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `${typeId}|${JSON.stringify(entries)}`
}

const buildResetTarget = (
    location: Vector3,
    crop: HarvesterCrop,
    currentStates: CropStates,
): ResetBlockTarget => {
    const resetStates = { ...currentStates, [crop.growthState]: crop.reset }
    return {
        location,
        key: canonicalPermutationKey(crop.blockType, resetStates),
        permutation: BlockPermutation.resolve(crop.blockType, resetStates),
    }
}

const safeFindMatchingBlocks = (
    dimension: Dimension,
    volume: BlockVolume,
    permutations: readonly BlockPermutation[],
): ListBlockVolumeType | undefined => {
    try {
        return dimension.getBlocks(volume, { includePermutations: [...permutations] }, false)
    } catch {
        return undefined
    }
}

const safeBlockAbove = (block: Block): Block | undefined => {
    try {
        return block.above()
    } catch {
        return undefined
    }
}

const safeFillBlocks = (dimension: Dimension, locations: Vector3[], permutation: BlockPermutation): boolean => {
    try {
        dimension.fillBlocks(new ListBlockVolume(locations), permutation)
        return true
    } catch {
        return false
    }
}

const snapshotContainerSlots = (container: Container): (VirtualSlot | undefined)[] =>
    Array.from({ length: container.size }, (_, index) => {
        const item = container.getItem(index)
        return item ? { sample: item, amount: item.amount, maxAmount: item.maxAmount } : undefined
    })

const tryInsertVirtualStack = (slots: (VirtualSlot | undefined)[], stack: ItemStack): boolean => {
    let remaining = stack.amount
    if (remaining <= 0) return true

    for (const slot of slots) {
        if (!slot || slot.amount >= slot.maxAmount) continue
        if (slot.sample.typeId !== stack.typeId || !slot.sample.isStackableWith(stack)) continue
        const add = Math.min(remaining, slot.maxAmount - slot.amount)
        slot.amount += add
        remaining -= add
        if (remaining === 0) return true
    }

    for (let index = 0; index < slots.length; index++) {
        if (slots[index] !== undefined) continue
        const add = Math.min(remaining, stack.maxAmount)
        slots[index] = { sample: stack, amount: add, maxAmount: stack.maxAmount }
        remaining -= add
        if (remaining === 0) return true
    }

    return false
}

const tryAcceptGroupLoot = (
    slots: readonly (VirtualSlot | undefined)[],
    loot: readonly ItemStack[],
): (VirtualSlot | undefined)[] | undefined => {
    const nextSlots = slots.map(slot => (slot ? { ...slot } : undefined))
    for (const stack of loot) {
        if (!tryInsertVirtualStack(nextSlots, stack)) return undefined
    }
    return nextSlots
}

const mergeLootStacks = (stacks: readonly ItemStack[]): ItemStack[] => {
    const merged: ItemStack[] = []
    for (const stack of stacks) {
        let remaining = stack.amount
        for (const target of merged) {
            if (target.amount >= target.maxAmount) continue
            if (target.typeId !== stack.typeId || !target.isStackableWith(stack)) continue
            const add = Math.min(remaining, target.maxAmount - target.amount)
            target.amount += add
            remaining -= add
            if (remaining === 0) break
        }
        while (remaining > 0) {
            const copy = stack.clone()
            const amount = Math.min(remaining, copy.maxAmount)
            copy.amount = amount
            merged.push(copy)
            remaining -= amount
        }
    }
    return merged
}

const collectCropGroup = (
    baseBlock: Block,
    crop: HarvesterCrop,
    hoe: ItemStack,
    lootManager: LootTableManager,
): CropGroup | undefined => {
    const baseStates = baseBlock.permutation.getAllStates()
    if (baseStates[crop.growthState] !== crop.ripe) return undefined

    const blocks: ResetBlockTarget[] = [buildResetTarget(baseBlock.location, crop, baseStates)]
    const loot: ItemStack[] = [...(lootManager.generateLootFromBlockPermutation(baseBlock.permutation, hoe) ?? [])]

    let current = baseBlock
    for (let step = 0; step < HARVESTER_PYLON_CONFIG.maxBlocksAbove; step++) {
        const above = safeBlockAbove(current)
        if (!above || above.typeId !== crop.blockType) break
        const aboveStates = above.permutation.getAllStates()
        if (aboveStates[crop.growthState] !== crop.ripe) break
        blocks.push(buildResetTarget(above.location, crop, aboveStates))
        loot.push(...(lootManager.generateLootFromBlockPermutation(above.permutation, hoe) ?? []))
        current = above
    }

    return { blocks, loot }
}

const rollToolDamage = (harvestedCount: number, damageChance: number): number => {
    let damage = 0
    for (let index = 0; index < harvestedCount; index++) {
        if (Math.random() < damageChance) damage++
    }
    return damage
}

const applyToolWear = (
    pylonContainer: Container,
    toolSlot: number,
    hoe: ItemStack,
    harvestedCount: number,
): void => {
    if (harvestedCount <= 0) return

    const durability = hoe.getComponent(ItemComponentTypes.Durability)
    if (!durability || durability.unbreakable) return

    const rawUnbreaking =
        hoe.getComponent(ItemComponentTypes.Enchantable)?.getEnchantment(HARVESTER_PYLON_CONFIG.unbreakingEnchantmentId)
            ?.level ?? 0
    const unbreakingLevel = Math.min(3, Math.max(0, rawUnbreaking))
    const addedDamage = rollToolDamage(harvestedCount, durability.getDamageChance(unbreakingLevel))
    if (addedDamage <= 0) return

    const nextDamage = durability.damage + addedDamage
    if (nextDamage >= durability.maxDurability) {
        pylonContainer.setItem(toolSlot, undefined)
        return
    }

    durability.damage = nextDamage
    pylonContainer.setItem(toolSlot, hoe)
}

export const executeHarvesterPlan = (params: HarvesterPlanParams): void => {
    const permutations = readyPermutations()
    if (permutations.length === 0) return

    const volume = buildScanVolume(params.origin, rangeToRadius(params.rangeSize))
    const matches = safeFindMatchingBlocks(params.dimension, volume, permutations)
    if (!matches) return

    let virtualSlots = snapshotContainerSlots(params.outputContainer)
    const lootManager = world.getLootTableManager()
    const acceptedGroups: CropGroup[] = []
    let plannedBlocks = 0

    for (const location of matches.getBlockLocationIterator()) {
        if (plannedBlocks >= HARVESTER_PYLON_CONFIG.maxHarvestsPerWake) break

        const block = safeGetBlock(params.dimension, location)
        if (!block) continue

        const crop = harvesterCrops.get(block.typeId)
        if (!crop) continue

        const group = collectCropGroup(block, crop, params.hoe, lootManager)
        if (!group) continue
        if (plannedBlocks + group.blocks.length > HARVESTER_PYLON_CONFIG.maxHarvestsPerWake) break

        const nextSlots = tryAcceptGroupLoot(virtualSlots, group.loot)
        if (!nextSlots) break

        virtualSlots = nextSlots
        acceptedGroups.push(group)
        plannedBlocks += group.blocks.length
    }

    if (acceptedGroups.length === 0) return

    const resetBatches = new Map<string, { readonly permutation: BlockPermutation; readonly locations: Vector3[] }>()
    for (const group of acceptedGroups) {
        for (const target of group.blocks) {
            const existing = resetBatches.get(target.key)
            if (existing) {
                existing.locations.push(target.location)
            } else {
                resetBatches.set(target.key, { permutation: target.permutation, locations: [target.location] })
            }
        }
    }

    const succeededKeys = new Set<string>()
    const harvestedLocations: Vector3[] = []
    for (const [key, batch] of resetBatches) {
        if (safeFillBlocks(params.dimension, batch.locations, batch.permutation)) {
            succeededKeys.add(key)
            harvestedLocations.push(...batch.locations)
        }
    }
    const harvestedCount = harvestedLocations.length
    if (harvestedCount === 0) return

    const harvestedLoot: ItemStack[] = []
    for (const group of acceptedGroups) {
        if (group.blocks.every(target => succeededKeys.has(target.key))) {
            harvestedLoot.push(...group.loot)
        }
    }

    for (const stack of mergeLootStacks(harvestedLoot)) {
        params.outputContainer.addItem(stack)
    }

    applyToolWear(params.pylonContainer, params.toolSlot, params.hoe, harvestedCount)
    playHarvestFeedback(params.dimension, harvestedLocations)
}
