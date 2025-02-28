import { ElectronAPI } from '@electron-toolkit/preload'
import { Store } from '../main/store'

type NestKey<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${K & string}` | `${K & string}.${NestKey<T[K]> & string}`
        : `${K & string}`
    }[keyof T]
  : ''
type NestValue<T, K extends NestKey<T>> = K extends `${infer Key}.${infer Rest}`
  ? T[Key] extends object
    ? NestValue<T[Key], Rest>
    : never
  : T[K]
declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      set<Key extends NestKey<Store>>(
        key: Key,
        value: NestValue<Store, Key>
      ): void
      get<Key extends NestKey<Store>>(key: Key): NestValue<Store, Key>
    }
  }
}
