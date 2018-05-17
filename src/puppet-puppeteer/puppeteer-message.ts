// import * as fs    from 'fs'
// import * as path  from 'path'
// import * as mime  from 'mime'
// import {
//   Readable,
// }                 from 'stream'

// import {
//   Raven,
//   log,
// }                       from '../config'
// import Misc             from '../misc'

import {
  Message,
}           from '../puppet/'

// import PuppetPuppeteer  from './puppet-puppeteer'
// import PuppeteerContact from './puppeteer-contact'
// import PuppeteerRoom    from './puppeteer-room'

// import {
//   WebAppMsgType,
//   WebMessageRawPayload,
//   WebMsgType,
// }                 from '../puppet/schemas/'

// export interface WebMsgPayload {
//   id:       string,
//   type:     WebMsgType,
//   from:     string,
//   to?:      string,  // if to is not set, then room must be set
//   room?:    string,
//   content:  string,
//   status:   string,
//   digest:   string,
//   date:     number,

//   url?:     string,  // for MessageMedia class
// }

export class PuppeteerMessage extends Message {}

export default PuppeteerMessage
