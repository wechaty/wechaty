import cuid    from 'cuid'

export function generateToken () {
  const token = cuid().substr(1) + cuid().substr(1) // substr: get rid of the starting `c`
  return token.toUpperCase()
}
