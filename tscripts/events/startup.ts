import { system } from '@minecraft/server'
import { destroyPylonAt, spawnPylonEntity } from '../core/pylon/PylonLifecycle'
import { bootstrapPylonsFeature } from '../features/pylons/index'
import { BLOCK_COMPONENT_IDS } from '../shared/identifiers'

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    bootstrapPylonsFeature()

    blockComponentRegistry.registerCustomComponent(BLOCK_COMPONENT_IDS.pylon, {
        onPlace: ({ block }) => {
            system.run(() => {
                if (block.isValid) spawnPylonEntity(block)
            })
        },
        onBreak: ({ block, dimension }) => {
            destroyPylonAt(dimension, block.location)
        },
    })

    blockComponentRegistry.registerCustomComponent(BLOCK_COMPONENT_IDS.uiPlaceholderBlock, {
        onPlace: ({ block }) => {
            block.setType('minecraft:air')
        },
    })
})
