const fs = require('fs')
async function main() {
    const text = await fs.readFileSync('README.md')
    const beginIndex = text.toString().search(/\[comment\]\: # \(JSDOC SYNC BEGIN\)/)
    const endIndex = text.toString().search(/\[comment\]\: # \(JSDOC SYNC END\)/)
    const sub = text.toString().substring(beginIndex, endIndex)

    const docIndex = await fs.readFileSync('docs/doc-index.md')
    const result = text.toString().replace(sub, '[comment]: # (JSDOC SYNC BEGIN) \n\n' + docIndex + '\n')
    await fs.writeFileSync('README.md', result, 'utf8')
}
main()
