import React, { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

type Props = {
  fen: string
  onSolved: (correct: boolean) => void
}

export default function ChessProblemBoard({ fen, onSolved }: Props) {
  const gameRef = useRef(new Chess(fen))
  const [position, setPosition] = useState(fen)

  useEffect(() => {
    gameRef.current = new Chess(fen)
    setPosition(fen)
  }, [fen])

  function onPieceDrop(source: string, target: string) {
    const gameCopy = new Chess(gameRef.current.fen())
    const move = gameCopy.move({ from: source, to: target, promotion: 'q' })
    if (move === null) return false

    const isMate = gameCopy.in_checkmate()
    // update live position
    gameRef.current = gameCopy
    setPosition(gameCopy.fen())
    onSolved(isMate)
    return true
  }

  return (
    <div>
      <Chessboard
        position={position}
        onPieceDrop={(source, target) => onPieceDrop(source, target)}
        arePiecesDraggable={true}
        boardWidth={520}
      />
    </div>
  )
}
