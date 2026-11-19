import { CommandPermissionLevel, PlayerPermissionLevel, type Player } from '@minecraft/server'

export const isOperator = (player: Player): boolean =>
    player.commandPermissionLevel >= CommandPermissionLevel.Admin ||
    player.playerPermissionLevel === PlayerPermissionLevel.Operator
