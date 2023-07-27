const rules = {
  'no-void': ["error", { "allowAsStatement": true }],
  'dot-notation': ['off'],
  '@typescript-eslint/no-misused-promises': ['warn']
}

module.exports = {
  extends: '@chatie',
  rules,
  "globals": {
    "NodeJS": true
  },
}
