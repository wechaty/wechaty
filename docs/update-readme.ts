const fs = require('fs')
async function main() {
    const text = await fs.readFileSync('README.md')
    const beginIndex = text.toString().search(/\[comment\]\: <> \(JSDOC SYNC BEGIN\)/)
    const endIndex = text.toString().search(/\[comment\]\: <> \(JSDOC SYNC END\)/)
    const sub = text.toString().substring(beginIndex, endIndex)
    const result = text.toString().replace(sub, '[comment]: <> (JSDOC SYNC BEGIN) \n\n#include "docs/doc-index.md" \n')
    await fs.writeFileSync('README.md', result, 'utf8')
}
main()
