export const NAMESPACE = 'pylons' as const

export const RESOURCE_PACK_ID = '43910f45-a23b-426f-9235-f8cc0af363a2' as const

export const BLOCK_IDS = {
    infusionPylon: `${NAMESPACE}:infusion_pylon`,
    harvesterPylon: `${NAMESPACE}:harvester_pylon`,
    expulsionPylon: `${NAMESPACE}:expulsion_pylon`,
    interdictionPylon: `${NAMESPACE}:interdiction_pylon`,
    protectionPylon: `${NAMESPACE}:protection_pylon`,
    uiPanelLeft: `${NAMESPACE}:ui_panel_left`,
    uiPanelRight: `${NAMESPACE}:ui_panel_right`,
    uiPanelRangedLeft: `${NAMESPACE}:ui_panel_ranged_left`,
    uiPanelRangedRight: `${NAMESPACE}:ui_panel_ranged_right`,
    uiPanelToolLeft: `${NAMESPACE}:ui_panel_tool_left`,
    uiPanelToolRight: `${NAMESPACE}:ui_panel_tool_right`,
} as const

export const BLOCK_STATE_IDS = {
    fakeSelection: `${NAMESPACE}:fake_selection`,
} as const

export const BLOCK_COMPONENT_IDS = {
    pylon: `${NAMESPACE}:pylon`,
    uiPlaceholderBlock: `${NAMESPACE}:ui_placeholder_block`,
} as const

export const ENTITY_IDS = {
    pylonContainer: `${NAMESPACE}:pylon_container`,
} as const

export const ENTITY_EVENT_IDS = {
    addCollision: `${NAMESPACE}:add_collision`,
    removeCollision: `${NAMESPACE}:remove_collision`,
    resetState: `${NAMESPACE}:reset_state`,
} as const

export const ITEM_IDS = {
    uiPlaceholder: `${NAMESPACE}:ui_placeholder`,
    uiSlotBlocked: `${NAMESPACE}:ui_slot_blocked`,
    uiWorkingOn: `${NAMESPACE}:ui_working_on`,
    uiWorkingOff: `${NAMESPACE}:ui_working_off`,
    uiRange1x1: `${NAMESPACE}:ui_range_1x1`,
    uiRange3x3: `${NAMESPACE}:ui_range_3x3`,
    uiRange5x5: `${NAMESPACE}:ui_range_5x5`,
    uiRange7x7: `${NAMESPACE}:ui_range_7x7`,
    uiRange9x9: `${NAMESPACE}:ui_range_9x9`,
    mobFilter: `${NAMESPACE}:mob_filter`,
    playerFilter: `${NAMESPACE}:player_filter`,
    blockFilter: `${NAMESPACE}:block_filter`,
    lifelessFilter: `${NAMESPACE}:lifeless_filter`,
    potionFilter: `${NAMESPACE}:potion_filter`,
} as const

export const VANILLA_ITEM_TAGS = {
    hoe: 'minecraft:is_hoe',
} as const

export const DYNAMIC_PROPERTY_IDS = {
    ownerId: `${NAMESPACE}:owner_id`,
    ownerName: `${NAMESPACE}:owner_name`,
    working: `${NAMESPACE}:working`,
    range: `${NAMESPACE}:range`,
    layoutProfile: `${NAMESPACE}:layout_profile`,
    layoutVersion: `${NAMESPACE}:layout_version`,
    uiProfile: `${NAMESPACE}:ui_profile`,
    pylonBlockId: `${NAMESPACE}:block_id`,
    filterData: `${NAMESPACE}:filter`,
    infusionIndex: `${NAMESPACE}:infusion_index`,
} as const

export const SCRIPT_EVENT_IDS = {
    debug: `${NAMESPACE}:debug`,
    selftest: `${NAMESPACE}:selftest`,
    uiProfile: `${NAMESPACE}:ui_profile`,
} as const

export const DIMENSION_IDS = ['overworld', 'nether', 'the_end'] as const

export const FILTER_ITEM_TYPE_IDS: readonly string[] = [
    ITEM_IDS.mobFilter,
    ITEM_IDS.playerFilter,
    ITEM_IDS.blockFilter,
    ITEM_IDS.lifelessFilter,
    ITEM_IDS.potionFilter,
]

const FILTER_ITEM_TYPE_ID_SET = new Set<string>(FILTER_ITEM_TYPE_IDS)

export const isFilterItemTypeId = (typeId: string): boolean => FILTER_ITEM_TYPE_ID_SET.has(typeId)

const UI_ITEM_TYPE_IDS = new Set<string>([
    BLOCK_IDS.uiPanelLeft,
    BLOCK_IDS.uiPanelRight,
    BLOCK_IDS.uiPanelRangedLeft,
    BLOCK_IDS.uiPanelRangedRight,
    BLOCK_IDS.uiPanelToolLeft,
    BLOCK_IDS.uiPanelToolRight,
    ITEM_IDS.uiPlaceholder,
    ITEM_IDS.uiSlotBlocked,
    ITEM_IDS.uiWorkingOn,
    ITEM_IDS.uiWorkingOff,
    ITEM_IDS.uiRange1x1,
    ITEM_IDS.uiRange3x3,
    ITEM_IDS.uiRange5x5,
    ITEM_IDS.uiRange7x7,
    ITEM_IDS.uiRange9x9,
])

export const isUiItemTypeId = (typeId: string): boolean => UI_ITEM_TYPE_IDS.has(typeId)
