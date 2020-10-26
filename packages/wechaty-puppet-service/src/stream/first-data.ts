import {
  Readable,
}           from './typed-stream'

const TIMEOUT = 10 * 1000

async function firstData<T> (
  stream: Readable<T>
): Promise<T> {
  const chunk = await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(reject, TIMEOUT)
    stream.once('data', chunk => {
      stream.pause()
      clearTimeout(timer)

      resolve(chunk)
    })

  })
  stream.resume()
  return chunk
}

export {
  firstData,
}
