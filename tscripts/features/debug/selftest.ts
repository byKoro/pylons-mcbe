import type { Player } from '@minecraft/server'
import { runEffectsSelftest } from './effectsSelftest'

export const handleSelftestScriptEvent = (player: Player, suite: string): void => {
    if (suite === 'effects') {
        runEffectsSelftest(player)
        return
    }
    player.sendMessage(`[Pylons:Selftest] Unknown suite: ${suite}. Known: effects`)
}
