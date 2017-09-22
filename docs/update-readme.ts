const fs = require('fs')
async function updateReadme() {
  const readme = await fs.readFileSync('README.md')
  const beginIndex = readme.toString().search(/\[comment\]\: # \(JSDOC SYNC BEGIN\)/)
  const endIndex = readme.toString().search(/\[comment\]\: # \(JSDOC SYNC END\)/)
  const docString = readme.toString().substring(beginIndex, endIndex)

  const docIndex = await fs.readFileSync('docs/doc-index.md')
  const insertToReadme = readme.toString().replace(docString, '[comment]: # (JSDOC SYNC BEGIN) \n\n' + docIndex + '\n')
  await fs.writeFileSync('README.md', insertToReadme, 'utf8')
}
updateReadme()
