const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'data.sqlite')

const db = new sqlite3.Database(DB_PATH)

function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)
}

function seedProblems(problems) {
  const insert = db.prepare('INSERT INTO problems (title, fen) VALUES (?, ?)')
  problems.forEach(p => insert.run(p.title || '', p.fen))
  insert.finalize()
}

module.exports = { db, init, seedProblems }
