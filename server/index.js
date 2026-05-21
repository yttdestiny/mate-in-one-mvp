const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const { db, init, seedProblems } = require('./db')

init()

const app = express()
app.use(cors())
app.use(bodyParser.json())

// Seed problems from frontend data if empty
db.get('SELECT COUNT(*) as c FROM problems', (err, row) => {
  if (!err && row && row.c === 0) {
    const p = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'problems.json')))
    seedProblems(p)
    console.log('Seeded problems')
  }
})

// Simple APIs
app.get('/api/problems', (req, res) => {
  db.all('SELECT id, title, fen FROM problems', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(rows)
  })
})

app.post('/api/verify', (req, res) => {
  const { fen, from, to } = req.body
  if (!fen || !from || !to) return res.status(400).json({ error: 'missing' })
  const { Chess } = require('chess.js')
  const g = new Chess(fen)
  const move = g.move({ from, to, promotion: 'q' })
  if (!move) return res.json({ valid: false, mate: false })
  const mate = g.in_checkmate()
  res.json({ valid: true, mate })
})

app.post('/api/users/register', (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'missing username' })
  db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
    if (err) return res.status(400).json({ error: err.message })
    res.json({ id: this.lastID, username })
  })
})

app.get('/api/leaderboard', (req, res) => {
  db.all('SELECT id, username, score FROM users ORDER BY score DESC LIMIT 20', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(rows)
  })
})

app.post('/api/submit', (req, res) => {
  const { userId, problemId, correct } = req.body
  if (typeof correct !== 'number' && typeof correct !== 'boolean') return res.status(400).json({ error: 'missing correct' })
  const corr = correct ? 1 : 0
  db.run('INSERT INTO attempts (user_id, problem_id, correct) VALUES (?, ?, ?)', [userId || null, problemId || null, corr], function(err) {
    if (err) return res.status(500).json({ error: err.message })
    if (corr && userId) {
      db.run('UPDATE users SET score = score + 1 WHERE id = ?', [userId])
    }
    res.json({ ok: true })
  })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('Server listening on', PORT))
