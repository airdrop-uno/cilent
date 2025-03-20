const userAgents = [
  'Chrome-Win10',
  'Chrome-Mac',
  'Firefox-Win',
  'Firefox-Mac',
  'Chrome-Linux'
]

export default () => userAgents[Math.floor(Math.random() * userAgents.length)]
