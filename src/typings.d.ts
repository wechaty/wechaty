declare module 'bl'
declare module 'blessed-contrib'
declare module 'qrcode-terminal'

declare var window

// Extend the `Window` from Browser
interface Window {
  emit: Function, // from puppeteer
}

declare const WechatyBro: any
