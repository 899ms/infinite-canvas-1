export async function persistBeforeCommit<T>(value: T, persist: (value: T) => Promise<unknown>, commit: (value: T) => void) {
    await persist(value);
    commit(value);
}
