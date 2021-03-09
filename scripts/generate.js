/* Imports */
const chalk = require('chalk')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')


/* Definitions */
const basePath = './SQLExportedDB'
const outFile = './extra/generated/props.sql'


/* Helpers */
function show (msg, em) {
  if (em) console.log(chalk.blue.inverse(msg))
  else console.log(chalk.blue(msg))
}

function append (what) {
  fs.appendFileSync(path.resolve(outFile), what)
}

const noModifier = (data, file) => data.replace(/\n+GO/gm, '\nGO')
function appendFile (file, modifier = noModifier) {
  append(modifier(fs.readFileSync(path.resolve(basePath, file)) + '\n\n', file))
}

function appendDir (dir, modifier) {
  const files = fs.readdirSync(path.resolve(basePath, dir))
  files.forEach(file => appendFile(path.join(dir, file), modifier))
}


/* GO */
show('Start..', true)
mkdirp.sync(path.resolve(path.parse(outFile).dir))
fs.writeFileSync(path.resolve(outFile), '')

show('SET PROPERTIES')
appendFile('props.sql')

show('CREATE USERS')
appendDir('users')

show('CREATE SCHEMAS')
appendFile('schemas.sql', function (data) {
  data = data.replace(/ authorization \[(.+)\]/g, '')
  data = data.replace(/\n\tand exists\(select p.principal_id from sys.database_principals p where p.name = '(.+?)'\) begin/g, 'begin')

  return data
})

show('CREATE TABLES')
appendDir('tables')

show('CREATE VIEWS')
appendDir('views')

show('CREATE PROCEDURES')
appendDir('procedures')

show('INSERT DATA')
appendDir('data', function (data, file) {
  const table = file.split(path.sep).pop().replace('.tsv', '')
  data = data.replace(/\t/g, "','")
  data = data.replace(/^(.+)$/gm, "  ('$1'),")

  let columns = fs.readFileSync(path.resolve(basePath, file.replace('data', 'tables').replace('tsv', 'sql')), {encoding: 'utf8'})
  const hasIdentity = columns.includes('IDENTITY')
  columns = columns.replace(/^((?! {3}\[).)*$\r?\n?/gm, '') // linhas que nao sao de defini��o de ??
  columns = columns.replace(/ {3}\[(.+?)\].+\r?\n?/gm, '$1, ')
  columns = columns.slice(0, -2) // remove ultima virgula

  data = (hasIdentity ? `SET IDENTITY_INSERT ${table} ON\n` : '') +
         `INSERT INTO ${table} (${columns})\n` +
         'VALUES\n' +
         data
  data = data.slice(0, -5) // remove \r e \n extras e ultima virgula
  if (hasIdentity) data += `\nSET IDENTITY_INSERT ${table} OFF`
  data += '\nGO\n\n'

  return data
})

show('Done!', true)
