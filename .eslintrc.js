// {
//   "rules": {
//       "indent": [
//           "error",
//           4,
//           {
//               "CallExpression": {
//                   "arguments": "first"
//               }
//           }
//       ]
//   }
// }

const rules = {
  indent: ['error', 2, {
    CallExpression: {
      arguments: 'off',
    },
    SwitchCase: 1,
  }],
}

module.exports = {
  extends: '@chatie',
  rules,
}
