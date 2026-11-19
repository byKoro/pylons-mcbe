import type { PylonKindDefinition } from './types'

class PylonKindRegistry {
    private readonly definitions = new Map<string, PylonKindDefinition>()

    register(definition: PylonKindDefinition): void {
        this.definitions.set(definition.blockTypeId, definition)
    }

    get(blockTypeId: string): PylonKindDefinition | undefined {
        return this.definitions.get(blockTypeId)
    }

    has(blockTypeId: string): boolean {
        return this.definitions.has(blockTypeId)
    }
}

export const pylonKindRegistry = new PylonKindRegistry()
