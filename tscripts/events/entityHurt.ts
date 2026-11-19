import { world } from '@minecraft/server'
import { handleBeforeHurtProtectedMob } from '../features/pylons/protection/index'

world.beforeEvents.entityHurt.subscribe(handleBeforeHurtProtectedMob)
