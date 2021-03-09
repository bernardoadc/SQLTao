/* Imports */
const chalk = require('chalk')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')


/* Definitions */
const basePath = './SQLExportedDB'
const outFile = './extra/generated/sync.sql'


/* Helpers */
function show (msg, em) {
  if (em) console.log(chalk.blue.inverse(msg))
  else console.log(chalk.blue(msg))
}

function append (what) {
  fs.appendFileSync(path.resolve(outFile), what)
}

const noModifier = (data, file) => data.replace(/(\r?\n)+GO/gm, '\r\nGO')
function appendFile (file, modifier = noModifier) {
  append(modifier(fs.readFileSync(path.resolve(basePath, file)) + '\r\n\r\n', file))
}

function appendDir (dir, modifier) {
  const files = fs.readdirSync(path.resolve(basePath, dir))
  files.forEach(file => appendFile(path.join(dir, file), modifier))
}

function getColumns (tableDef) {
  let columns = tableDef.replace(/^((?! {3}\[).)*$\r?\n?/gm, '') // linhas que nao sao de defini��o de ??
  columns = columns.replace(/ {3}\[(.+?)\].+\r?\n?/gm, '$1, ')
  columns = columns.slice(0, -2) // remove ultima virgula

  return columns
}


/* Analysers */

function dropStatements (data, file, type) { // except tables
  let objName = '[' + file.split(path.sep).pop().replace('.sql', '').replace('.', '].[') + ']'
  if (!objName.includes('.')) objName = `[dbo].${objName}`

  return data.replace(/\r?\nSET ANSI_NULLS ON\s*\r?\nGO\s*\r?\n/gm, `
SET ANSI_NULLS ON
GO

if exists(
  select o.name
    from sys.objects o
  inner join sys.schemas s
      on o.schema_id = s.schema_id
  where '${objName}' = '[' + s.name + '].[' + o.name + ']'
) DROP ${type} ${objName}
GO
`)
}

function getDataTables () {
  let dataTables = fs.readdirSync(path.resolve(basePath, 'data'))
  dataTables = dataTables.map((f) => f.replace('.tsv', ''))
  dataTables = dataTables.map((f) => '[' + f.replace('.', '].[') + ']')

  return dataTables
}

function getLastGeneratedTables () {
  const lastGenerated = fs.readFileSync(path.resolve(outFile.replace('sync', 'props')), {encoding: 'utf8'})
  let generatedTables = lastGenerated.match(/\r?\n(CREATE TABLE )(.*\r?\n)+?SET/gm)
  generatedTables = generatedTables[0].slice(1, -3) // remove inicio e fim (\n e SET)
  generatedTables = generatedTables.split('CREATE TABLE ')
  generatedTables.shift()
  generatedTables = generatedTables.reduce(function (o, t) {
    const table = t.match(/\s?(.+?)\s?\(\r\n/)[1]

    o[table] = `CREATE TABLE ${t}`

    return o
  }, {})

  return generatedTables
}

function dropDataTables (data, tablename) {
  const rgx = data.match(/CREATE TABLE/)

  return data.replace(/CREATE TABLE/, `
  if exists(
    select o.name
      from sys.objects o
      inner join sys.schemas s
        on o.schema_id = s.schema_id
      where '${tablename}' = '[' + s.name + '].[' + o.name + ']'
  ) DROP TABLE ${tablename}
  GO

  CREATE TABLE`)
}

function compareOtherTables (tablename, tableDef1, tableDef2) {
  tableDef1 = tableDef1.slice(0, tableDef1.indexOf('GO')) + 'GO\r\n'
  tableDef2 = tableDef2.slice(0, tableDef2.indexOf('GO')) + 'GO\r\n'

  // if not exists create

  if (tableDef1 !== tableDef2)
    console.log(`mudou definição da tabela ${tablename}!`)

  return `
if not exists(
  select o.name
    from sys.objects o
    inner join sys.schemas s
      on o.schema_id = s.schema_id
    where '${tablename}' = '[' + s.name + '].[' + o.name + ']'
)
${tableDef2}`
}

function analyseTables (data, file) {
  let tablename = '[' + file.split(path.sep).pop().replace('.sql', '').replace('.', '].[') + ']'
  if (!tablename.includes('.')) tablename = `[dbo].${tablename}`

  if (dataTables.includes(tablename))
    return dropDataTables(data, tablename)
  else
    return compareOtherTables(tablename, lastGeneratedTables[tablename], data)
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
  data = data.replace(/\r?\n\tand exists\(select p.principal_id from sys.database_principals p where p.name = '(.+?)'\) begin/g, 'begin')

  return data
})

//assemblies
//table_types
//user_defined_types
//functions

show('CREATE TABLES')
const dataTables = getDataTables()
const lastGeneratedTables = getLastGeneratedTables()
appendDir('tables', analyseTables)

show('CREATE VIEWS')
appendDir('views', (data, file) => dropStatements(data, file, 'VIEW'))

show('CREATE PROCEDURES')
appendDir('procedures', (data, file) => dropStatements(data, file, 'PROCEDURE'))

//synonyms

show('INSERT DATA')
appendDir('data', function (data, file) {
  const tablename = file.split(path.sep).pop().replace('.tsv', '')
  data = data.replace(/\t/g, "','")
  data = data.replace(/^(.+)$/gm, "  ('$1'),")

  const table = fs.readFileSync(path.resolve(basePath, file.replace('data', 'tables').replace('tsv', 'sql')), {encoding: 'utf8'})
  const hasIdentity = table.includes('IDENTITY')
  const columns = getColumns(table)

  data = (hasIdentity ? `SET IDENTITY_INSERT ${tablename} ON\n` : '') +
         `INSERT INTO ${tablename} (${columns})\n` +
         'VALUES\n' +
         data
  data = data.slice(0, -7) // remove \r? e \n extras e ultima virgula
  if (hasIdentity) data += `\nSET IDENTITY_INSERT ${tablename} OFF`
  data += '\nGO\n\n'

  return data
})

//triggers

show('Done!', true)
