const assert = require('assert')
const { Chess } = require('chess.js')

function isMateInOne(fen) {
  const g = new Chess(fen)
  const moves = g.moves({ verbose: true })
  for (const m of moves) {
    const copy = new Chess(fen)
    copy.move({ from: m.from, to: m.to, promotion: 'q' })
    if (copy.in_checkmate()) return true
  }
  return false
}

assert.strictEqual(isMateInOne('6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1'), false)
console.log('basic-verify test passed')
