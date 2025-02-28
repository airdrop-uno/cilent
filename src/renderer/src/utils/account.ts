import { Account } from '../../../types/account'

export const formateAddress = (address: string) => {
  return `${address.slice(0, 6)}****${address.slice(-4)}`
}
export const createAccounts = async (amount: number): Promise<Account[]> =>
  new Promise((resolve) => {
    window.electron.ipcRenderer.send('createAccount', amount)
    window.electron.ipcRenderer.on(
      'createAccount',
      (_event, accounts: Account[]) => {
        resolve(accounts)
      }
    )
  })

export const updateAccount = async (account: Account): Promise<Account[]> =>
  new Promise((resolve) => {
    window.electron.ipcRenderer.send('updateAccount', account)
    window.electron.ipcRenderer.on(
      'updateAccount',
      (
        _event,
        { accounts, status }: { accounts: Account[]; status: boolean }
      ) => {
        if (status) {
          resolve(accounts)
        }
      }
    )
  })

export const checkApiKey = (key: string) =>
  new Promise((resolve, reject) => {
    window.electron.ipcRenderer.send('checkApiKey', key)
    window.electron.ipcRenderer.on(
      'checkApiKey',
      (_event, result: { status: boolean; error?: string }) => {
        const { status, error } = result
        if (status) {
          resolve(result)
        } else {
          reject(error)
        }
      }
    )
  })
