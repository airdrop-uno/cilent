import { electronStore } from '../../store'

export const openBrowser = (address: string) => {
  const accounts = electronStore.get('accounts')
  const account = accounts.find((w) => w.address === address)
  if (!account) return
}
