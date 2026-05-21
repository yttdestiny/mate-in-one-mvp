import React, { useState } from 'react'
import ChessProblemBoard from './components/ChessProblemBoard'
import problems from './data/problems.json'

export default function App() {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const problem = problems[index]

  function handleSolved(correct: boolean) {
    setStatus(correct ? 'correct' : 'wrong')
  }

  function next() {
    setStatus('idle')
    setIndex((i) => (i + 1) % problems.length)
  }

  return (
    <div className="container">
      <h1>Mate-in-One 题库（MVP）</h1>
      <div className="content">
        <ChessProblemBoard fen={problem.fen} onSolved={handleSolved} />
        <div className="panel">
          <h2>{problem.title}</h2>
          <p>目标：找到一步将死（mate in one）</p>
          <div className="result">
            {status === 'idle' && <span>请走一步。</span>}
            {status === 'correct' && <span className="ok">正确！一步将死。</span>}
            {status === 'wrong' && <span className="bad">该步不能将死，请再试。</span>}
          </div>
          <div className="controls">
            <button onClick={next}>下一题</button>
          </div>
        </div>
      </div>
    </div>
  )
}
