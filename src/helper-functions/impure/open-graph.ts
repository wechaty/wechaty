import og from 'open-graph'

export async function openGraph (url: string): Promise<og.Data> {
  return new Promise((resolve, reject) => {
    og(url, (err, meta) => {
      if (err) {
        reject(err)
      } else {
        resolve(meta)
      }
    })
  })
}
