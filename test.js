import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 1, autoStart: false })
const fetchSomething = async (name) => {
  console.log(name)
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
queue.pause()
queue.add(async () => {
  console.log('foo')
  fetchSomething('foo')
})
queue.add(async () => {
  console.log('bar')
  fetchSomething('bar')
})
queue.add(async () => {
  console.log('baz')
  fetchSomething('baz')
})

queue.add(async () => {
  console.log('foo123')
  fetchSomething('foo123')
})
queue.add(async () => {
  console.log('bar123')
  fetchSomething('bar123')
})
queue.add(async () => {
  console.log('baz123')
  fetchSomething('baz123')
})
queue.start()
