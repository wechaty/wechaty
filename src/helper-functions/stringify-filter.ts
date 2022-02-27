// https://stackoverflow.com/a/38251445/1123955

function stringifyFilter (_key: string, value: any) {
  if (value instanceof RegExp) {
    return value.toString()
  }

  return value
}

export {
  stringifyFilter,
}
