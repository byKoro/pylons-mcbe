declare const console: {
    readonly warn: (message: string) => void
}

export const logWarn = (message: string): void => {
    console.warn(message)
}
