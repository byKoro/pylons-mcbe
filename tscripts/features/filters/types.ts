export interface PotionFilterConfig {
    readonly minimumDurationSeconds: number
    readonly requiredDurationSeconds: number
    readonly maximumPotency: number
    readonly allowedEffects: readonly string[]
    readonly deniedEffects: readonly string[]
}

export interface MobFilterPayload {
    readonly kind: 'mob'
    readonly entityTypeId: string
    readonly localizationKey: string
}

export interface PlayerFilterPayload {
    readonly kind: 'player'
    readonly playerId: string
    readonly playerName: string
}

export interface BlockFilterPayload {
    readonly kind: 'block'
    readonly blockTypeId: string
    readonly localizationKey: string
}

export interface LifelessFilterPayload {
    readonly kind: 'lifeless'
}

export interface PotionFilterPayload {
    readonly kind: 'potion'
    readonly effectTypeId: string
    readonly amplifier: number
    readonly durationTicks: number
    readonly displayName: string
}

export type FilterPayload =
    | MobFilterPayload
    | PlayerFilterPayload
    | BlockFilterPayload
    | LifelessFilterPayload
    | PotionFilterPayload
