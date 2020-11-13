import { Puppet } from 'wechaty-puppet'

function isWechatyPuppet (o: any): o is Puppet {
  if (o instanceof Puppet) {
    return true
  } else if (o && o.constructor && o.constructor.name === 'Puppet') {
    return true
  }

  return false
}

export { isWechatyPuppet }
