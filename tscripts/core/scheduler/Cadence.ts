export const OPEN_UI_DELAY_TICKS = 1 as const
export const IDLE_PYLON_DELAY_TICKS = 20 as const
export const WARMUP_TICKS = 10 as const
export const SNEAK_WATCHER_INTERVAL_TICKS = 4 as const

const STAGGER_SPAN_TICKS = 10 as const

export const toStaggerOffset = (id: string): number => {
    let hash = 0
    for (let index = 0; index < id.length; index++) {
        hash = (hash * 31 + id.charCodeAt(index)) | 0
    }
    return Math.abs(hash) % STAGGER_SPAN_TICKS
}
