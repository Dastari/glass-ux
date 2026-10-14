import type { ReactNode } from 'react'
import { ActionProvider } from '../../ui/actions/index.js'
/** Isolates the specimen's action runner; data belongs to the gallery. */
export function DeviceGallery({children}:{children:ReactNode}) {return <ActionProvider>{children}</ActionProvider>}
