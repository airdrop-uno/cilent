/// <reference types="vite/client" />

declare global {
  interface Window {
    $message: ReturnType<typeof useMessage>
    $dialog: ReturnType<typeof useDialog>
    $notification: ReturnType<typeof useNotification>
    $loadingBar: ReturnType<typeof useLoadingBar>
  }
}
