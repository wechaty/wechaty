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
  // indent: ['error', 2, {
  //   CallExpression: {
  //     arguments: 'off',
  //   },
  //   SwitchCase: 1,
  // }],
  'no-useless-constructor': 'off',
  '@typescript-eslint/no-useless-constructor': 'off',
  'no-dupe-class-members': 'off',
  'operator-linebreak': ['error', 'before'],
}

module.exports = {
  extends: '@chatie',
  rules,
}
