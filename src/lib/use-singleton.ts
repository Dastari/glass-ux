import { useEffect, useId, useSyncExternalStore } from "react"

/*
 * Some hosts must exist exactly once however many times they are mounted (the toast
 * viewport, the confirm host, the command palette): the app root mounts them, and so may
 * a gallery section rendered inside it. The first mounted instance owns the slot; the
 * others render nothing until it unmounts.
 */
const owners = new Map<string, string[]>()
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSingleton(slot: string): boolean {
  const id = useId()
  useEffect(() => {
    const list = owners.get(slot) ?? []
    owners.set(slot, [...list, id])
    emit()
    return () => {
      owners.set(
        slot,
        (owners.get(slot) ?? []).filter((entry) => entry !== id)
      )
      emit()
    }
  }, [slot, id])
  return useSyncExternalStore(
    subscribe,
    () => owners.get(slot)?.[0] === id,
    () => false
  )
}
