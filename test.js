import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 2, autoStart: false })
const fetchSomething = async (name) => {
  console.log(name)
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
// queue.pause()
queue.add(async () => {
  console.log('foo')
  await fetchSomething('foo fetchSomething')
})
queue.add(async () => {
  console.log('bar')
  await fetchSomething('bar fetchSomething')
})
queue.add(async () => {
  console.log('baz')
  await fetchSomething('baz fetchSomething')
})

queue.add(async () => {
  console.log('foo123')
  await fetchSomething('foo123 fetchSomething')
})
queue.add(async () => {
  console.log('bar123')
  await fetchSomething('bar123 fetchSomething')
})
queue.add(async () => {
  console.log('baz123')
  await fetchSomething('baz123 fetchSomething')
})
// queue.start()
