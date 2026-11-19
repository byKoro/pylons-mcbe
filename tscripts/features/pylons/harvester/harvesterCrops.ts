import { BlockPermutation, BlockStates, BlockTypes, system, world, type ItemStack } from '@minecraft/server'
import { describeError } from '../../../shared/errors'
import { logWarn } from '../../../shared/log'
import { HARVESTER_PYLON_CONFIG, type VanillaCropSpec } from './config'

export type CropStateValue = string | number | boolean
export type CropStates = Readonly<Record<string, CropStateValue>>

export interface HarvesterCrop {
    readonly blockType: string
    readonly growthState: string
    readonly ripe: number
    readonly reset: number
    readonly ready: readonly CropStates[]
}

interface LootSample {
    readonly types: ReadonlySet<string>
    readonly minTotal: number
    readonly maxTotal: number
}

type ClassificationVerdict =
    | {
          readonly kind: 'crop'
          readonly crop: HarvesterCrop
          readonly resolvedReady: readonly BlockPermutation[]
      }
    | { readonly kind: 'ignored' }
    | { readonly kind: 'skipped'; readonly reason: string }
    | { readonly kind: 'unrelated' }

const shortName = (state: string): string => state.slice(state.lastIndexOf(':') + 1)

const isNumber = (value: CropStateValue): value is number => typeof value === 'number'

const isGrowthState = (state: string, values: readonly CropStateValue[]): boolean =>
    HARVESTER_PYLON_CONFIG.growthStateNames.has(shortName(state)) &&
    values.length >= HARVESTER_PYLON_CONFIG.minGrowthValues &&
    values.every(isNumber)

const combinations = (options: Readonly<Record<string, readonly CropStateValue[]>>): CropStates[] =>
    Object.entries(options).reduce<CropStates[]>(
        (partial, [name, values]) => partial.flatMap(states => values.map(value => ({ ...states, [name]: value }))),
        [{}],
    )

const validValuesOf = (states: readonly string[]): ReadonlyMap<string, readonly CropStateValue[]> | undefined => {
    const values = new Map<string, readonly CropStateValue[]>()
    for (const state of states) {
        const valid = BlockStates.get(state)?.validValues
        if (!valid || valid.length === 0) return undefined
        values.set(state, valid)
    }
    return values
}

const totalAmount = (stacks: readonly ItemStack[]): number => stacks.reduce((total, { amount }) => total + amount, 0)

const sampleLoot = (permutation: BlockPermutation): LootSample => {
    const loot = world.getLootTableManager()
    const rolls = Array.from(
        { length: HARVESTER_PYLON_CONFIG.lootSampleRolls },
        () => loot.generateLootFromBlockPermutation(permutation) ?? [],
    )
    const totals = rolls.map(totalAmount)
    return {
        types: new Set(rolls.flat().map(({ typeId }) => typeId)),
        minTotal: Math.min(...totals),
        maxTotal: Math.max(...totals),
    }
}

const ripensLoot = (ripe: LootSample, reset: LootSample): boolean =>
    [...ripe.types].some(typeId => !reset.types.has(typeId)) || ripe.minTotal > reset.maxTotal

const buildReadyForCrop = (
    blockType: string,
    values: ReadonlyMap<string, readonly CropStateValue[]>,
    growthState: string,
    ripe: number,
): { readonly ready: readonly CropStates[]; readonly resolvedReady: readonly BlockPermutation[] } | undefined => {
    const others = [...values].filter(([name]) => name !== growthState)
    const readyCount = others.reduce((count, [, valid]) => count * valid.length, 1)
    if (readyCount > HARVESTER_PYLON_CONFIG.maxReadyPermutationsPerCrop) return undefined
    const ready = combinations(Object.fromEntries([...others, [growthState, [ripe]]]))
    const resolvedReady = ready.map(states => BlockPermutation.resolve(blockType, { ...states }))
    return { ready, resolvedReady }
}

const resolveVanillaCrop = (spec: VanillaCropSpec): ClassificationVerdict => {
    try {
        const growthValues = BlockStates.get(spec.growthState)?.validValues?.filter(isNumber) ?? []
        if (growthValues.length === 0) {
            return { kind: 'skipped', reason: `missing numeric values for ${spec.growthState}` }
        }
        const defaults = BlockPermutation.resolve(spec.blockType).getAllStates()
        const values = validValuesOf(Object.keys(defaults))
        if (!values) {
            return { kind: 'skipped', reason: `state values unknown for ${spec.blockType}` }
        }
        const ripe = Math.max(...growthValues)
        const reset = spec.resetOverride ?? Math.min(...growthValues)
        const built = buildReadyForCrop(spec.blockType, values, spec.growthState, ripe)
        if (!built) {
            return { kind: 'skipped', reason: `ready permutations exceed limit for ${spec.blockType}` }
        }
        return {
            kind: 'crop',
            crop: {
                blockType: spec.blockType,
                growthState: spec.growthState,
                ripe,
                reset,
                ready: built.ready,
            },
            resolvedReady: built.resolvedReady,
        }
    } catch (error) {
        return { kind: 'skipped', reason: describeError(error) }
    }
}

const classifyAddonCrop = (blockType: string): ClassificationVerdict => {
    if (blockType.startsWith(HARVESTER_PYLON_CONFIG.vanillaNamespace)) return { kind: 'unrelated' }

    try {
        const defaults = BlockPermutation.resolve(blockType).getAllStates()
        const values = validValuesOf(Object.keys(defaults))
        if (!values) return { kind: 'skipped', reason: 'state values unknown' }

        const growthStates = [...values].filter(([name, valid]) => isGrowthState(name, valid)).map(([name]) => name)
        const growthState = growthStates[0]
        if (!growthState) return { kind: 'unrelated' }
        if (growthStates.length > 1) return { kind: 'skipped', reason: 'several growth states' }

        const growthValues = values.get(growthState)?.filter(isNumber) ?? []
        const ripe = Math.max(...growthValues)
        const reset = Math.min(...growthValues)

        const ripeLoot = sampleLoot(BlockPermutation.resolve(blockType, { ...defaults, [growthState]: ripe }))
        if (ripeLoot.types.size === 0) return { kind: 'ignored' }

        const resetLoot = sampleLoot(BlockPermutation.resolve(blockType, { ...defaults, [growthState]: reset }))
        if (!ripensLoot(ripeLoot, resetLoot)) return { kind: 'ignored' }

        const built = buildReadyForCrop(blockType, values, growthState, ripe)
        if (!built) return { kind: 'skipped', reason: 'too many ready permutations' }

        return {
            kind: 'crop',
            crop: {
                blockType,
                growthState,
                ripe,
                reset,
                ready: built.ready,
            },
            resolvedReady: built.resolvedReady,
        }
    } catch (error) {
        return { kind: 'skipped', reason: describeError(error) }
    }
}

class HarvesterCropsCatalog {
    private crops: ReadonlyMap<string, HarvesterCrop> | undefined
    private readyPermutations: readonly BlockPermutation[] = []
    private vanillaSkipped = 0
    private started = false

    private ensureVanilla(): void {
        if (this.crops !== undefined) return

        const crops = new Map<string, HarvesterCrop>()
        const ready: BlockPermutation[] = []
        let skipped = 0

        for (const spec of HARVESTER_PYLON_CONFIG.vanillaCrops) {
            const verdict = resolveVanillaCrop(spec)
            if (verdict.kind === 'crop') {
                crops.set(spec.blockType, verdict.crop)
                ready.push(...verdict.resolvedReady)
            } else if (verdict.kind === 'skipped') {
                skipped++
            }
        }

        this.crops = crops
        this.readyPermutations = ready
        this.vanillaSkipped = skipped
    }

    public build(): void {
        if (this.started) return
        this.started = true
        this.ensureVanilla()
        system.runJob(this.detect())
    }

    public get(blockType: string): HarvesterCrop | undefined {
        this.ensureVanilla()
        return this.crops?.get(blockType)
    }

    public getReadyPermutations(): readonly BlockPermutation[] {
        this.ensureVanilla()
        return this.readyPermutations
    }

    private *detect(): Generator<void, void, void> {
        const types = BlockTypes.getAll()
        yield

        const crops = new Map(this.crops)
        const ready = [...this.readyPermutations]
        let detected = 0
        let ignored = 0
        let skipped = this.vanillaSkipped

        for (const { id } of types) {
            const verdict = classifyAddonCrop(id)
            if (verdict.kind === 'crop') {
                crops.set(id, verdict.crop)
                ready.push(...verdict.resolvedReady)
                detected++
            } else if (verdict.kind === 'ignored') {
                ignored++
            } else if (verdict.kind === 'skipped') {
                skipped++
            }
            yield
        }

        this.crops = crops
        this.readyPermutations = ready
        logWarn(
            `[Pylons:Harvester] Crop catalog built: ${crops.size} crops (${detected} add-on), ${ignored} ignored, ${skipped} skipped.`,
        )
    }
}

export const harvesterCrops = new HarvesterCropsCatalog()

export const buildHarvesterCrops = (): void => {
    harvesterCrops.build()
}
