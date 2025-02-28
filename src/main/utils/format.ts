export const parseProxy = (proxy: string): string => {
  const parts = proxy.trim().split(':')
  switch (parts.length) {
    case 2:
      return `http://${parts[0]}:${parts[1]}`
    case 4:
      return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`
    case 5:
      return `${parts[0]}://${parts[3]}:${parts[4]}@${parts[1]}:${parts[2]}`
    default:
      throw new Error(`Invalid proxy: ${proxy}`)
  }
}
