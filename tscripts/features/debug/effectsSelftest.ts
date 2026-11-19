import { EffectTypes, Player, system, type Effect } from '@minecraft/server'
import { describeError } from '../../shared/errors'

declare const console: {
    readonly warn: (message: string) => void
}

const LOG_PREFIX = '[Pylons:Selftest:Effects]' as const
const UNREADABLE = 'UNREADABLE' as const
const TEST_DURATION_TICKS = 200 as const
const ABSORPTION_EFFECT_ID = 'minecraft:absorption' as const

const readField = <T>(label: string, read: () => T): T | undefined => {
    try {
        return read()
    } catch (error) {
        console.warn(`${LOG_PREFIX} FAIL ${label} ${describeError(error)}`)
        return undefined
    }
}

const formatValue = (value: string | number | boolean | undefined): string =>
    value === undefined ? UNREADABLE : String(value)

const readAbsorptionFields = (stage: string, effect: Effect | undefined): void => {
    if (!effect) {
        console.warn(`${LOG_PREFIX} ${stage}: not active`)
        return
    }
    const typeId = readField(`${stage}.typeId`, () => effect.typeId)
    const amplifier = readField(`${stage}.amplifier`, () => effect.amplifier)
    const duration = readField(`${stage}.duration`, () => effect.duration)
    const displayName = readField(`${stage}.displayName`, () => effect.displayName)
    console.warn(
        `${LOG_PREFIX} ${stage}: typeId=${formatValue(typeId)} amp=${formatValue(amplifier)} dur=${formatValue(duration)} name=${formatValue(displayName)}`,
    )
}

export const runEffectsSelftest = (player: Player): void => {
    const typeIds = EffectTypes.getAll().map(effectType => effectType.getName())
    console.warn(`${LOG_PREFIX} A: count=${typeIds.length} ids=${typeIds.join(', ')}`)

    let appliedCount = 0
    for (const typeId of typeIds) {
        const added = readField(`B.addEffect(${typeId})`, () =>
            player.addEffect(typeId, TEST_DURATION_TICKS, { amplifier: 0, showParticles: false }),
        )
        if (added !== undefined) appliedCount += 1
    }
    console.warn(`${LOG_PREFIX} B: applied=${appliedCount}/${typeIds.length}`)

    const effects = player.getEffects()
    console.warn(`${LOG_PREFIX} C: getEffects() count=${effects.length}`)
    effects.forEach((effect, index) => {
        const typeId = readField(`C[${index}].typeId`, () => effect.typeId)
        const labelPrefix = `C[${index}](${typeId ?? UNREADABLE})`
        const amplifier = readField(`${labelPrefix}.amplifier`, () => effect.amplifier)
        const duration = readField(`${labelPrefix}.duration`, () => effect.duration)
        const displayName = readField(`${labelPrefix}.displayName`, () => effect.displayName)
        const isValid = readField(`${labelPrefix}.isValid`, () => effect.isValid)
        console.warn(
            `${LOG_PREFIX} effect ${formatValue(typeId)} amp=${formatValue(amplifier)} dur=${formatValue(duration)} name=${formatValue(displayName)} valid=${formatValue(isValid)}`,
        )
    })

    const inactiveTypeIds: string[] = []
    for (const typeId of typeIds) {
        const single = readField(`D.getEffect(${typeId})`, () => player.getEffect(typeId))
        if (single === undefined) {
            inactiveTypeIds.push(typeId)
            continue
        }
        const displayName = readField(`D(${typeId}).displayName`, () => single.displayName)
        const amplifier = readField(`D(${typeId}).amplifier`, () => single.amplifier)
        console.warn(
            `${LOG_PREFIX} D: ${typeId} name=${formatValue(displayName)} amp=${formatValue(amplifier)}`,
        )
    }
    if (inactiveTypeIds.length > 0) {
        console.warn(`${LOG_PREFIX} D: not active (${inactiveTypeIds.length}): ${inactiveTypeIds.join(', ')}`)
    }

    const immediateAbsorption =
        readField(`E.addEffect(${ABSORPTION_EFFECT_ID})`, () =>
            player.addEffect(ABSORPTION_EFFECT_ID, TEST_DURATION_TICKS, {
                amplifier: 2,
                showParticles: false,
            }),
        ) ?? readField(`E.t0.getEffect(${ABSORPTION_EFFECT_ID})`, () => player.getEffect(ABSORPTION_EFFECT_ID))
    readAbsorptionFields('E.t0', immediateAbsorption)

    system.runTimeout(() => {
        if (!player.isValid) return

        const delayedAbsorption = readField(`E.t1.getEffect(${ABSORPTION_EFFECT_ID})`, () =>
            player.getEffect(ABSORPTION_EFFECT_ID),
        )
        readAbsorptionFields('E.t1', delayedAbsorption)

        const cleanupIds = typeIds.includes(ABSORPTION_EFFECT_ID)
            ? typeIds
            : [...typeIds, ABSORPTION_EFFECT_ID]
        for (const typeId of cleanupIds) {
            readField(`F.removeEffect(${typeId})`, () => player.removeEffect(typeId))
        }

        player.sendMessage('[Pylons:Selftest] effects done, see console (search "Pylons:Selftest").')
    }, 1)
}
