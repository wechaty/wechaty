// https://stackoverflow.com/a/24417399/1123955
export function padchatDecode<T = Object>(encodedText: string): T {
  if (!encodedText) {
    throw new Error('no encodedText')
  }

  let decodedText: string

  // it seems the different server API version (bond with different wechat accounts)
  // is not consistent of the protocol: some time return URIEncoded, and some time return Plain JSON Text.
  try {
    // Server return data need decodeURIComponent
    decodedText = encodedText.replace(/\+/g, '%20')
    decodedText = decodeURIComponent(decodedText)
  } catch (e) {
    // Server return data no need decodeURIComponent
    decodedText = encodedText
  }

  const decodedObject: T = JSON.parse(decodedText)
  return decodedObject
}
