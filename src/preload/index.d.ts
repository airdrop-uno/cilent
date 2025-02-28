import { ElectronAPI } from '@electron-toolkit/preload'
import { Store } from '../main/store'
declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      set<Key extends keyof Store>(key: Key, value: Store[Key]): void
      get<Key extends keyof Store>(key: Key): Store[Key]
    }
  }
}
