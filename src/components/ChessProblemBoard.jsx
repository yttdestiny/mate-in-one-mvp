import React from 'react';
import { Chessboard } from 'react-chessboard';
import bB from '../assets/pieces/rhosgfx/bB.svg?url';
import bK from '../assets/pieces/rhosgfx/bK.svg?url';
import bN from '../assets/pieces/rhosgfx/bN.svg?url';
import bP from '../assets/pieces/rhosgfx/bP.svg?url';
import bQ from '../assets/pieces/rhosgfx/bQ.svg?url';
import bR from '../assets/pieces/rhosgfx/bR.svg?url';
import wB from '../assets/pieces/rhosgfx/wB.svg?url';
import wK from '../assets/pieces/rhosgfx/wK.svg?url';
import wN from '../assets/pieces/rhosgfx/wN.svg?url';
import wP from '../assets/pieces/rhosgfx/wP.svg?url';
import wQ from '../assets/pieces/rhosgfx/wQ.svg?url';
import wR from '../assets/pieces/rhosgfx/wR.svg?url';

const pieceImages = {
  bB,
  bK,
  bN,
  bP,
  bQ,
  bR,
  wB,
  wK,
  wN,
  wP,
  wQ,
  wR,
};

const customPieces = Object.fromEntries(
  Object.entries(pieceImages).map(([piece, src]) => [
    piece,
    ({ isDragging, squareWidth }) => (
      <span
        className={`pieceToken ${piece[0] === 'w' ? 'pieceTokenWhite' : 'pieceTokenBlack'}`}
        data-dragging={isDragging}
        style={{
          '--piece-size': `${Math.max(34, squareWidth * 0.86)}px`,
        }}
      >
        <img alt="" className="pieceImage" draggable="false" src={src} />
      </span>
    ),
  ]),
);

export default function ChessProblemBoard({
  boardTheme,
  boardWidth,
  customArrows,
  customSquareStyles,
  isDraggablePiece,
  onDragOverSquare,
  onMouseOutSquare,
  onMouseOverSquare,
  onPieceDragBegin,
  onPieceDragEnd,
  onPieceDrop,
  onSquareClick,
  orientation,
  position,
}) {
  const theme = boardTheme ?? {};

  return (
    <div className="boardFrame">
      <Chessboard
        animationDuration={180}
        areArrowsAllowed={false}
        arePiecesDraggable
        boardOrientation={orientation === 'b' ? 'black' : 'white'}
        boardWidth={boardWidth}
        customArrows={customArrows}
        customBoardStyle={{ borderRadius: 6, boxShadow: 'none' }}
        customDarkSquareStyle={{ backgroundColor: theme.dark ?? '#82b781' }}
        customDropSquareStyle={{
          boxShadow: `inset 0 0 0 5px ${theme.drop ?? 'rgba(241, 99, 84, 0.82)'}`,
        }}
        customLightSquareStyle={{ backgroundColor: theme.light ?? '#f8edcf' }}
        customNotationStyle={{ color: theme.notation ?? '#284234', fontSize: 12, fontWeight: 900 }}
        customPieces={customPieces}
        customSquareStyles={customSquareStyles}
        dropOffBoardAction="snapback"
        id="mate-in-one-board"
        isDraggablePiece={isDraggablePiece}
        onDragOverSquare={onDragOverSquare}
        onMouseOutSquare={onMouseOutSquare}
        onMouseOverSquare={onMouseOverSquare}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        position={position}
        showBoardNotation
        snapToCursor
      />
    </div>
  );
}
