import { EntityComponentTypes, ItemStack, type Container, type Entity } from '@minecraft/server'
import { BLOCK_IDS, DYNAMIC_PROPERTY_IDS, ITEM_IDS, isUiItemTypeId } from '../../shared/identifiers'
import type { PylonKindDefinition, PylonLayoutSpec, RangeSize, UiProfile } from './types'

export const CONTAINER_SIZE = 27 as const
export const CURRENT_LAYOUT_VERSION = 2 as const

const LEGACY_CLASSIC_FILTER_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17] as const
const LEGACY_CLASSIC_TOOL_SLOTS = [13] as const
const CLASSIC_FILTER_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
const CLASSIC_TOOL_SLOTS = [4] as const
const POCKET_FILTER_SLOTS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const
const POCKET_TOOL_SLOTS = [7] as const

const CLASSIC_FILTER_LAYOUT: PylonLayoutSpec = {
    profile: 'classic',
    filterSlots: CLASSIC_FILTER_SLOTS,
    filterSlotSet: new Set(CLASSIC_FILTER_SLOTS),
    toggleButtonSlot: 13,
    panelLeftItemId: BLOCK_IDS.uiPanelLeft,
    panelRightItemId: BLOCK_IDS.uiPanelRight,
    panelLeftSlot: 18,
    panelRightSlot: 26,
    placeholderItemId: ITEM_IDS.uiPlaceholder,
}

const CLASSIC_RANGED_FILTER_LAYOUT: PylonLayoutSpec = {
    profile: 'classic',
    filterSlots: CLASSIC_FILTER_SLOTS,
    filterSlotSet: new Set(CLASSIC_FILTER_SLOTS),
    toggleButtonSlot: 12,
    rangeButtonSlot: 14,
    panelLeftItemId: BLOCK_IDS.uiPanelRangedLeft,
    panelRightItemId: BLOCK_IDS.uiPanelRangedRight,
    panelLeftSlot: 18,
    panelRightSlot: 26,
    placeholderItemId: ITEM_IDS.uiPlaceholder,
}

const CLASSIC_RANGED_TOOL_LAYOUT: PylonLayoutSpec = {
    profile: 'classic',
    filterSlots: CLASSIC_TOOL_SLOTS,
    filterSlotSet: new Set(CLASSIC_TOOL_SLOTS),
    toggleButtonSlot: 12,
    rangeButtonSlot: 14,
    panelLeftItemId: BLOCK_IDS.uiPanelToolLeft,
    panelRightItemId: BLOCK_IDS.uiPanelToolRight,
    panelLeftSlot: 18,
    panelRightSlot: 26,
    placeholderItemId: ITEM_IDS.uiPlaceholder,
}

const POCKET_FILTER_LAYOUT: PylonLayoutSpec = {
    profile: 'pocket',
    filterSlots: POCKET_FILTER_SLOTS,
    filterSlotSet: new Set(POCKET_FILTER_SLOTS),
    toggleButtonSlot: 0,
    placeholderItemId: ITEM_IDS.uiSlotBlocked,
}

const POCKET_RANGED_FILTER_LAYOUT: PylonLayoutSpec = {
    profile: 'pocket',
    filterSlots: POCKET_FILTER_SLOTS,
    filterSlotSet: new Set(POCKET_FILTER_SLOTS),
    toggleButtonSlot: 0,
    rangeButtonSlot: 4,
    placeholderItemId: ITEM_IDS.uiSlotBlocked,
}

const POCKET_RANGED_TOOL_LAYOUT: PylonLayoutSpec = {
    profile: 'pocket',
    filterSlots: POCKET_TOOL_SLOTS,
    filterSlotSet: new Set(POCKET_TOOL_SLOTS),
    toggleButtonSlot: 0,
    rangeButtonSlot: 4,
    placeholderItemId: ITEM_IDS.uiSlotBlocked,
}

const RANGE_ITEM_IDS: Readonly<Record<RangeSize, string>> = {
    '1x1': ITEM_IDS.uiRange1x1,
    '3x3': ITEM_IDS.uiRange3x3,
    '5x5': ITEM_IDS.uiRange5x5,
    '7x7': ITEM_IDS.uiRange7x7,
    '9x9': ITEM_IDS.uiRange9x9,
}

export const getRangeItemId = (size: RangeSize): string => RANGE_ITEM_IDS[size]

export const getLayoutForPylon = (profile: UiProfile, definition: PylonKindDefinition): PylonLayoutSpec => {
    const hasRange = definition.rangeSpec.kind !== 'none'
    const isTool = definition.slotSpec.kind === 'tool'

    if (profile === 'pocket') {
        if (isTool) return POCKET_RANGED_TOOL_LAYOUT
        return hasRange ? POCKET_RANGED_FILTER_LAYOUT : POCKET_FILTER_LAYOUT
    }

    if (isTool) return CLASSIC_RANGED_TOOL_LAYOUT
    return hasRange ? CLASSIC_RANGED_FILTER_LAYOUT : CLASSIC_FILTER_LAYOUT
}

export const readPylonProfile = (entity: Entity): UiProfile =>
    entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutProfile) === 'pocket' ? 'pocket' : 'classic'

export const readPylonWorking = (entity: Entity): boolean =>
    entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.working) !== false

export const readPylonRange = (entity: Entity, definition: PylonKindDefinition): RangeSize | undefined => {
    if (definition.rangeSpec.kind === 'none') return undefined
    const raw = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.range)
    const sizes = definition.rangeSpec.sizes
    if (typeof raw === 'string') {
        const matched = sizes.find(size => size === raw)
        if (matched) return matched
    }
    return sizes[0]
}

export const cyclePylonRange = (entity: Entity, definition: PylonKindDefinition): RangeSize | undefined => {
    if (definition.rangeSpec.kind === 'none') return undefined
    const sizes = definition.rangeSpec.sizes
    const current = readPylonRange(entity, definition)
    const index = current ? sizes.indexOf(current) : -1
    const next = sizes[(index + 1) % sizes.length] ?? sizes[0]
    if (!next) return undefined
    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.range, next)
    return next
}

export const readPylonOwner = (entity: Entity): { readonly ownerId: string; readonly ownerName: string } => {
    const rawId = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.ownerId)
    const rawName = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.ownerName)
    return {
        ownerId: typeof rawId === 'string' ? rawId : '',
        ownerName: typeof rawName === 'string' ? rawName : 'None',
    }
}

export const expectedNonButtonUiItemId = (
    layout: PylonLayoutSpec,
    slot: number,
): string | undefined => {
    if (layout.filterSlotSet.has(slot) || slot === layout.toggleButtonSlot || slot === layout.rangeButtonSlot) {
        return undefined
    }
    if (slot === layout.panelLeftSlot) return layout.panelLeftItemId
    if (slot === layout.panelRightSlot) return layout.panelRightItemId
    return layout.placeholderItemId
}

export const createWorkingButtonItem = (
    definition: PylonKindDefinition,
    working: boolean,
    ownerName: string,
): ItemStack => {
    const item = new ItemStack(working ? ITEM_IDS.uiWorkingOn : ITEM_IDS.uiWorkingOff, 1)
    item.nameTag = working ? '§aWorking status: ON' : '§cWorking status: OFF'
    item.setLore([
        `§7Owner: §f${ownerName || 'None'}`,
        `§7${definition.headerText}`,
        '§8Click to toggle',
    ])
    return item
}

export const createRangeButtonItem = (
    definition: PylonKindDefinition,
    rangeSize: RangeSize,
    ownerName: string,
): ItemStack => {
    const title = definition.rangeSpec.kind === 'none' ? 'Work area' : definition.rangeSpec.hoverTitle
    const item = new ItemStack(RANGE_ITEM_IDS[rangeSize], 1)
    item.nameTag = `§b${title}: §f${rangeSize}`
    item.setLore([
        `§7Owner: §f${ownerName || 'None'}`,
        `§7${definition.headerText}`,
        '§8Click to cycle range',
    ])
    return item
}

const getContainer = (entity: Entity): Container | undefined =>
    entity.getComponent(EntityComponentTypes.Inventory)?.container

export const readPylonLayoutVersion = (entity: Entity): number => {
    const raw = entity.getDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutVersion)
    return typeof raw === 'number' && Number.isInteger(raw) ? raw : 1
}

const ensureLayoutVersion = (entity: Entity, definition: PylonKindDefinition, container: Container): void => {
    if (readPylonLayoutVersion(entity) >= CURRENT_LAYOUT_VERSION) return

    if (readPylonProfile(entity) === 'classic') {
        const isTool = definition.slotSpec.kind === 'tool'
        const oldSlots = isTool ? LEGACY_CLASSIC_TOOL_SLOTS : LEGACY_CLASSIC_FILTER_SLOTS
        const newSlots = isTool ? CLASSIC_TOOL_SLOTS : CLASSIC_FILTER_SLOTS

        const movedItems = oldSlots.map(slot => {
            const item = container.getItem(slot)
            return item && !isUiItemTypeId(item.typeId) ? item : undefined
        })

        for (const slot of oldSlots) {
            if (container.getItem(slot)) container.setItem(slot, undefined)
        }

        newSlots.forEach((slot, index) => {
            const item = movedItems[index]
            if (item) {
                container.setItem(slot, item)
                return
            }
            const existing = container.getItem(slot)
            if (existing && isUiItemTypeId(existing.typeId)) {
                container.setItem(slot, undefined)
            }
        })
    }

    entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutVersion, CURRENT_LAYOUT_VERSION)
}

export const syncPylonContainer = (
    entity: Entity,
    definition: PylonKindDefinition,
    targetProfile: UiProfile,
    refreshButtons = false,
): void => {
    const container = getContainer(entity)
    if (!container) return

    ensureLayoutVersion(entity, definition, container)

    const currentProfile = readPylonProfile(entity)
    const currentLayout = getLayoutForPylon(currentProfile, definition)
    const targetLayout = getLayoutForPylon(targetProfile, definition)
    const profileChanged = currentProfile !== targetProfile

    if (profileChanged) {
        const storedItems = currentLayout.filterSlots.map(slot => {
            const item = container.getItem(slot)
            return item && !isUiItemTypeId(item.typeId) ? item : undefined
        })
        for (const slot of currentLayout.filterSlots) {
            if (!targetLayout.filterSlotSet.has(slot) && container.getItem(slot)) {
                container.setItem(slot, undefined)
            }
        }
        targetLayout.filterSlots.forEach((slot, index) => {
            container.setItem(slot, storedItems[index])
        })
        entity.setDynamicProperty(DYNAMIC_PROPERTY_IDS.layoutProfile, targetProfile)
    }

    const working = readPylonWorking(entity)
    const { ownerName } = readPylonOwner(entity)
    const expectedWorkingId = working ? ITEM_IDS.uiWorkingOn : ITEM_IDS.uiWorkingOff
    const currentWorking = container.getItem(targetLayout.toggleButtonSlot)
    if (refreshButtons || profileChanged || currentWorking?.typeId !== expectedWorkingId) {
        container.setItem(targetLayout.toggleButtonSlot, createWorkingButtonItem(definition, working, ownerName))
    }

    if (targetLayout.rangeButtonSlot !== undefined) {
        const rangeSize = readPylonRange(entity, definition)
        if (rangeSize) {
            const expectedRangeId = RANGE_ITEM_IDS[rangeSize]
            const currentRange = container.getItem(targetLayout.rangeButtonSlot)
            if (refreshButtons || profileChanged || currentRange?.typeId !== expectedRangeId) {
                container.setItem(targetLayout.rangeButtonSlot, createRangeButtonItem(definition, rangeSize, ownerName))
            }
        }
    }

    for (let slot = 0; slot < CONTAINER_SIZE; slot++) {
        if (
            targetLayout.filterSlotSet.has(slot) ||
            slot === targetLayout.toggleButtonSlot ||
            slot === targetLayout.rangeButtonSlot
        ) {
            continue
        }
        const expectedId = expectedNonButtonUiItemId(targetLayout, slot)
        const current = container.getItem(slot)
        if (current?.typeId !== expectedId) {
            container.setItem(slot, expectedId ? new ItemStack(expectedId, 1) : undefined)
        }
    }
}

export const countOccupiedSlots = (entity: Entity, definition: PylonKindDefinition): number => {
    const container = getContainer(entity)
    if (!container) return 0
    ensureLayoutVersion(entity, definition, container)
    const layout = getLayoutForPylon(readPylonProfile(entity), definition)
    let count = 0
    for (const slot of layout.filterSlots) {
        const item = container.getItem(slot)
        if (item && !isUiItemTypeId(item.typeId)) count++
    }
    return count
}

export const dropRealSlotItems = (entity: Entity, definition: PylonKindDefinition | undefined): void => {
    const container = getContainer(entity)
    if (!container) return
    const { dimension, location } = entity
    if (!definition) {
        for (let slot = 0; slot < CONTAINER_SIZE; slot++) {
            const item = container.getItem(slot)
            if (!item || isUiItemTypeId(item.typeId)) continue
            dimension.spawnItem(item, location)
            container.setItem(slot, undefined)
        }
        return
    }
    ensureLayoutVersion(entity, definition, container)
    const layout = getLayoutForPylon(readPylonProfile(entity), definition)
    for (const slot of layout.filterSlots) {
        const item = container.getItem(slot)
        if (!item || isUiItemTypeId(item.typeId)) continue
        dimension.spawnItem(item, location)
        container.setItem(slot, undefined)
    }
}
