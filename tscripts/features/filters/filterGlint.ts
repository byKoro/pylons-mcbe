import {
    EnchantmentTypes,
    ItemComponentTypes,
    type Enchantment,
    type ItemStack,
} from '@minecraft/server'

const GLINT_ENCHANTMENT_ID = 'minecraft:infinity' as const
const GLINT_ENCHANTMENT_LEVEL = 1 as const

export const setFilterGlint = (itemStack: ItemStack, enabled: boolean): boolean => {
    const enchantable = itemStack.getComponent(ItemComponentTypes.Enchantable)
    if (!enchantable) return false

    const glintType = EnchantmentTypes.get(GLINT_ENCHANTMENT_ID)
    if (!glintType) return false

    if (!enabled) {
        try {
            if (!enchantable.hasEnchantment(glintType)) return true
            enchantable.removeEnchantment(glintType)
            return true
        } catch {
            return false
        }
    }

    const enchantment: Enchantment = {
        type: glintType,
        level: GLINT_ENCHANTMENT_LEVEL,
    }
    try {
        if (enchantable.hasEnchantment(glintType)) return true
        if (!enchantable.canAddEnchantment(enchantment)) return false
        enchantable.addEnchantment(enchantment)
        return true
    } catch {
        return false
    }
}
