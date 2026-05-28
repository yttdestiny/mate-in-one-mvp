import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  FlipHorizontal2,
  Lightbulb,
  LockKeyhole,
  MapPin,
  RotateCcw,
  Sparkles,
  TrainFront,
} from 'lucide-react';
import { Chess } from 'chess.js';
import ChessProblemBoard from './components/ChessProblemBoard.jsx';
import { puzzles, routes } from './puzzles.js';

const maxBoardSize = 560;

const promotionChoices = [
  { piece: 'q', label: '♕' },
  { piece: 'r', label: '♖' },
  { piece: 'b', label: '♗' },
  { piece: 'n', label: '♘' },
];

function puzzleTurn(puzzle) {
  return puzzle.fen.split(' ')[1];
}

function sideLabel(color) {
  return color === 'w' ? '白方' : '黑方';
}

function difficultyStars(stars) {
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
}

function solutionLabel(puzzle) {
  const solutions = puzzle?.solutions?.length ? puzzle.solutions : [puzzle?.solution].filter(Boolean);
  return solutions.join(' / ');
}

function mateMovesFor(fen, promotionChoice = 'q') {
  const game = new Chess(fen);
  return game.moves({ verbose: true }).filter((move) => {
    const clone = new Chess(fen);
    clone.move({ from: move.from, to: move.to, promotion: move.promotion || promotionChoice });
    return clone.isCheckmate();
  });
}

function useBoardSize() {
  const ref = useRef(null);
  const [size, setSize] = useState(520);

  useEffect(() => {
    if (!ref.current) return undefined;

    const updateSize = (width) => {
      const nextWidth = Math.floor(width || ref.current?.clientWidth || maxBoardSize);
      setSize(Math.max(260, Math.min(maxBoardSize, nextWidth - 24)));
    };

    updateSize(ref.current.clientWidth);

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => updateSize(ref.current?.clientWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

export default function App() {
  const [activeRouteId, setActiveRouteId] = useState(routes[0].id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [attempts, setAttempts] = useState(() => new Map());
  const [dragSource, setDragSource] = useState(null);
  const [hoverSquare, setHoverSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [mistakes, setMistakes] = useState(() => new Set());
  const [messageTone, setMessageTone] = useState('neutral');
  const [orientation, setOrientation] = useState('w');
  const [position, setPosition] = useState(puzzles[0].fen);
  const [promotionChoice, setPromotionChoice] = useState('q');
  const [revealSolution, setRevealSolution] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [solved, setSolved] = useState(() => new Set());
  const [status, setStatus] = useState('选择一条线路，从第一站开始走出一步杀。');
  const [boardHostRef, boardWidth] = useBoardSize();

  const activeRoute = routes.find((route) => route.id === activeRouteId) ?? routes[0];
  const routePuzzles = useMemo(
    () => puzzles.filter((item) => item.routeId === activeRoute.id),
    [activeRoute.id],
  );
  const puzzle = routePuzzles[activeIndex] ?? routePuzzles[0] ?? null;
  const turn = puzzle ? puzzleTurn(puzzle) : 'w';
  const routeSolvedCount = routePuzzles.filter((item) => solved.has(item.id)).length;
  const solvedCount = solved.size;
  const totalAttempts = [...attempts.values()].reduce((sum, count) => sum + count, 0);
  const accuracy = totalAttempts === 0 ? 100 : Math.round((solvedCount / totalAttempts) * 100);
  const currentAttempts = puzzle ? (attempts.get(puzzle.id) ?? 0) : 0;
  const stationUnlocked = puzzle ? solved.has(puzzle.id) : false;
  const mistakePuzzles = useMemo(
    () => [...mistakes].map((id) => puzzles.find((item) => item.id === id)).filter(Boolean),
    [mistakes],
  );

  const routeVars = {
    '--route-color': activeRoute.color,
    '--route-color-rgb': activeRoute.colorRgb,
    '--route-dark': activeRoute.dark,
    '--route-soft': activeRoute.soft,
  };

  const mateMoves = useMemo(
    () => (puzzle ? mateMovesFor(puzzle.fen, promotionChoice) : []),
    [promotionChoice, puzzle?.fen],
  );

  const customArrows = useMemo(() => {
    if (!revealSolution || !selectedSquare || legalTargets.length !== 1) return [];
    return [[selectedSquare, legalTargets[0], activeRoute.color]];
  }, [activeRoute.color, legalTargets, revealSolution, selectedSquare]);

  const customSquareStyles = useMemo(() => {
    const styles = {};
    const game = new Chess(position);
    const addStyle = (square, style) => {
      styles[square] = { ...styles[square], ...style };
    };

    if (lastMove) {
      addStyle(lastMove.from, {
        background: `linear-gradient(135deg, rgba(${activeRoute.colorRgb},0.42), rgba(${activeRoute.colorRgb},0.1))`,
      });
      addStyle(lastMove.to, {
        background: `linear-gradient(135deg, rgba(${activeRoute.colorRgb},0.58), rgba(${activeRoute.colorRgb},0.14))`,
      });
    }

    if (dragSource) {
      addStyle(dragSource, {
        boxShadow: `inset 0 0 0 5px rgba(${activeRoute.colorRgb}, 0.82)`,
      });
    }

    if (selectedSquare) {
      addStyle(selectedSquare, {
        boxShadow: 'inset 0 0 0 5px #f0c94b',
      });
    }

    for (const square of legalTargets) {
      const piece = game.get(square);
      addStyle(square, {
        background: piece
          ? `radial-gradient(circle, transparent 0 38%, rgba(${activeRoute.colorRgb},0.86) 39% 50%, transparent 51%)`
          : 'radial-gradient(circle, rgba(23,32,27,0.38) 0 17%, transparent 18%)',
      });
    }

    if (hoverSquare && legalTargets.includes(hoverSquare)) {
      addStyle(hoverSquare, {
        boxShadow: `inset 0 0 0 5px rgba(${activeRoute.colorRgb}, 0.72)`,
      });
    }

    return styles;
  }, [
    activeRoute.colorRgb,
    dragSource,
    hoverSquare,
    lastMove,
    legalTargets,
    position,
    selectedSquare,
  ]);

  function clearInteraction() {
    setSelectedSquare(null);
    setLegalTargets([]);
    setDragSource(null);
    setHoverSquare(null);
  }

  function applyPuzzle(nextPuzzle, index) {
    if (!nextPuzzle) return;
    setActiveIndex(index);
    setPosition(nextPuzzle.fen);
    setLastMove(null);
    setRevealSolution(false);
    setMessageTone('neutral');
    setStatus('选择己方棋子，然后走出一步将杀。');
    setOrientation(puzzleTurn(nextPuzzle));
    clearInteraction();
  }

  function changeRoute(routeId) {
    const nextRoute = routes.find((route) => route.id === routeId);
    const nextPuzzles = puzzles.filter((item) => item.routeId === routeId);
    const firstUnsolved = nextPuzzles.findIndex((item) => !solved.has(item.id));
    const nextIndex = firstUnsolved === -1 ? 0 : firstUnsolved;

    setActiveRouteId(nextRoute?.id ?? routes[0].id);
    if (!nextPuzzles.length) {
      setActiveIndex(0);
      setLastMove(null);
      setRevealSolution(false);
      setMessageTone('neutral');
      setStatus('这条线路的题目还在整理中，可以先从错题集或其他线路继续闯关。');
      clearInteraction();
      return;
    }
    applyPuzzle(nextPuzzles[nextIndex], nextIndex);
  }

  function loadPuzzle(index) {
    if (!routePuzzles[index]) return;
    applyPuzzle(routePuzzles[index], index);
  }

  function resetPuzzle() {
    loadPuzzle(activeIndex);
  }

  function selectSquare(square, announce = true) {
    const game = new Chess(position);
    const piece = game.get(square);

    if (game.isCheckmate()) return false;

    if (!piece) {
      clearInteraction();
      return false;
    }

    if (piece.color !== game.turn()) {
      clearInteraction();
      setMessageTone('warn');
      setStatus(`现在是${sideLabel(game.turn())}走。`);
      return false;
    }

    const targets = game.moves({ square, verbose: true }).map((move) => move.to);
    setSelectedSquare(square);
    setLegalTargets(targets);

    if (announce) {
      setMessageTone('neutral');
      setStatus(`${square} 已选中，${targets.length} 个合法落点已高亮。`);
    }

    return true;
  }

  function registerAttempt(puzzleId) {
    setAttempts((current) => {
      const next = new Map(current);
      next.set(puzzleId, (next.get(puzzleId) ?? 0) + 1);
      return next;
    });
  }

  function registerMistake(puzzleId) {
    setMistakes((current) => new Set(current).add(puzzleId));
  }

  function jumpToPuzzle(puzzleId) {
    const target = puzzles.find((item) => item.id === puzzleId);
    if (!target) return;

    const targetRoutePuzzles = puzzles.filter((item) => item.routeId === target.routeId);
    const nextIndex = targetRoutePuzzles.findIndex((item) => item.id === puzzleId);
    setActiveRouteId(target.routeId);
    applyPuzzle(target, Math.max(0, nextIndex));
  }

  function attemptMove(from, to) {
    if (!puzzle) return false;

    if (!to) {
      clearInteraction();
      return false;
    }

    const game = new Chess(position);
    let move = null;

    clearInteraction();

    try {
      move = game.move({ from, to, promotion: promotionChoice });
    } catch {
      move = null;
    }

    if (!move) {
      registerMistake(puzzle.id);
      setMessageTone('error');
      setStatus('这步不合法。棋子会回到原位，请重新找直接将杀。');
      return false;
    }

    setLastMove(move);
    registerAttempt(puzzle.id);

    if (game.isCheckmate()) {
      setSolved((current) => new Set(current).add(puzzle.id));
      setPosition(game.fen());
      setRevealSolution(true);
      setMessageTone('success');
      setStatus(`进站成功！${move.san} 是 ${puzzle.station.name} 的一步杀。`);
      return true;
    }

    const replies = game.moves().length;
    setMessageTone(game.isCheck() ? 'warn' : 'error');
    registerMistake(puzzle.id);
    setStatus(
      game.isCheck()
        ? `${move.san} 只是将军，对方还有 ${replies} 个合法应手。`
        : `${move.san} 不是将军。一步杀必须立即结束对局。`,
    );
    return false;
  }

  function handleSquareClick(square) {
    if (!puzzle) return;

    const game = new Chess(position);

    if (game.isCheckmate()) return;

    if (!selectedSquare) {
      selectSquare(square);
      return;
    }

    if (selectedSquare === square) {
      clearInteraction();
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      selectSquare(square);
      return;
    }

    attemptMove(selectedSquare, square);
  }

  function canDragPiece({ piece, sourceSquare }) {
    if (!puzzle) return false;

    const game = new Chess(position);
    const boardPiece = game.get(sourceSquare);
    return Boolean(
      boardPiece &&
        !game.isCheckmate() &&
        boardPiece.color === game.turn() &&
        piece[0] === game.turn(),
    );
  }

  function handlePieceDragBegin(_piece, sourceSquare) {
    if (selectSquare(sourceSquare, false)) {
      setDragSource(sourceSquare);
      setMessageTone('neutral');
      setStatus(`拖动 ${sourceSquare}，合法落点已高亮。`);
    }
  }

  function handlePieceDragEnd() {
    setDragSource(null);
    setHoverSquare(null);
  }

  function handlePieceDrop(sourceSquare, targetSquare) {
    return attemptMove(sourceSquare, targetSquare);
  }

  function showHint() {
    if (!puzzle) {
      setMessageTone('warn');
      setStatus('这条线路还没有题目，先选择已有站点或从错题集复习。');
      return;
    }

    const game = new Chess(position);

    if (game.isCheckmate()) {
      setRevealSolution(true);
      setMessageTone('success');
      setStatus(`这题已经完成，答案是 ${solutionLabel(puzzle)}。`);
      return;
    }

    if (!mateMoves.length) {
      setMessageTone('warn');
      setStatus('当前局面没有检测到一步杀，请重置这一站。');
      return;
    }

    const [first] = mateMoves;
    setSelectedSquare(first.from);
    setLegalTargets([first.to]);
    setRevealSolution(true);
    setMessageTone('neutral');
    setStatus(`${puzzle.station.name} 的杀棋从 ${first.from} 到 ${first.to}。`);
  }

  function nextPuzzle() {
    if (!routePuzzles.length) return;
    loadPuzzle((activeIndex + 1) % routePuzzles.length);
  }

  return (
    <main className="shell" style={routeVars}>
      <section className="workspace" aria-label="一步杀地铁闯关">
        <aside className="sidebar" aria-label="线路和站点">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              <TrainFront size={25} strokeWidth={2.6} />
            </span>
            <div>
              <p>Mate Metro</p>
              <h1>一步杀闯关线</h1>
            </div>
          </div>

          <div className="routeSelector" aria-label="选择线路">
            <div className="sectionLabel">
              <TrainFront aria-hidden="true" size={15} />
              <span>选择线路</span>
            </div>
            <div className="routeButtons">
              {routes.map((route) => {
                const routeItems = puzzles.filter((item) => item.routeId === route.id);
                const done = routeItems.filter((item) => solved.has(item.id)).length;
                return (
                  <button
                    className="routeButton"
                    data-active={route.id === activeRoute.id}
                    key={route.id}
                    onClick={() => changeRoute(route.id)}
                    style={{ '--line-color': route.color, '--line-soft': route.soft }}
                    type="button"
                  >
                    <span className="lineNumber">{route.number}</span>
                    <span>
                      <strong>{route.name}</strong>
                      <small>
                        {route.subtitle} · {done}/{routeItems.length} 站
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="routeBrief">
            <strong>{activeRoute.name}</strong>
            <span>{activeRoute.story}</span>
          </div>

          <div className="stats" aria-label="训练进度">
            <div>
              <strong>
                {routeSolvedCount}/{routePuzzles.length}
              </strong>
              <span>本线进度</span>
            </div>
            <div>
              <strong>{totalAttempts}</strong>
              <span>尝试</span>
            </div>
            <div>
              <strong>{accuracy}%</strong>
              <span>准确率</span>
            </div>
          </div>

          <div className="mistakePanel" aria-label="错题集">
            <div className="sectionLabel">
              <LockKeyhole aria-hidden="true" size={15} />
              <span>错题集</span>
              <strong>{mistakePuzzles.length}</strong>
            </div>
            {mistakePuzzles.length ? (
              <div className="mistakeList">
                {mistakePuzzles.map((item) => {
                  const route = routes.find((routeItem) => routeItem.id === item.routeId);
                  return (
                    <button
                      className="mistakeItem"
                      key={item.id}
                      onClick={() => jumpToPuzzle(item.id)}
                      type="button"
                    >
                      <span style={{ '--line-color': route?.color ?? activeRoute.color }}>
                        {route?.number ?? '?'}
                      </span>
                      <strong>{item.station.name}</strong>
                      <small>{item.title}</small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="emptyText">走错的站点会自动收进这里，方便反复巩固。</p>
            )}
          </div>

          <div className="stationDock">
            <div className="sectionLabel">
              <MapPin aria-hidden="true" size={15} />
              <span>闯关站点</span>
            </div>
            <div className="puzzleList stationList">
              {routePuzzles.length ? (
                routePuzzles.map((item, index) => (
                  <button
                    className="puzzleItem stationItem"
                    data-active={index === activeIndex}
                    data-solved={solved.has(item.id)}
                    key={item.id}
                    onClick={() => loadPuzzle(index)}
                    type="button"
                  >
                    <span className="stationDot" aria-hidden="true">
                      {solved.has(item.id) ? <BadgeCheck size={15} strokeWidth={2.8} /> : index + 1}
                    </span>
                    <span className="stationText">
                      <strong>{item.station.name}</strong>
                      <small>
                        {item.title} · {sideLabel(puzzleTurn(item))}
                      </small>
                    </span>
                    <em aria-label={`难度 ${item.stars} 星`}>{difficultyStars(item.stars)}</em>
                  </button>
                ))
              ) : (
                <div className="emptyLineCard">
                  <strong>{activeRoute.name}</strong>
                  <span>题库待导入</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="boardArea">
          <div className="topbar">
            <div>
              <p id="turnLabel">
                {routePuzzles.length
                  ? `${activeRoute.name} · 第 ${activeIndex + 1} 站 · ${sideLabel(turn)}先走`
                  : `${activeRoute.name} · 题库待导入`}
              </p>
              <h2>{puzzle ? puzzle.station.name : activeRoute.name}</h2>
            </div>
            <div className="toolbar" aria-label="棋盘操作">
              <button
                className="iconButton"
                onClick={() => setOrientation((current) => (current === 'w' ? 'b' : 'w'))}
                title="翻转棋盘"
                type="button"
              >
                <FlipHorizontal2 aria-hidden="true" size={20} strokeWidth={2.4} />
                <span className="srOnly">翻转棋盘</span>
              </button>
              <button className="iconButton" onClick={resetPuzzle} title="重置当前局面" type="button">
                <RotateCcw aria-hidden="true" size={20} strokeWidth={2.4} />
                <span className="srOnly">重置当前局面</span>
              </button>
              <button className="textButton" onClick={showHint} type="button">
                <Lightbulb aria-hidden="true" size={18} strokeWidth={2.4} />
                提示
              </button>
            </div>
          </div>

          {routePuzzles.length ? (
            <div className="routeRunway" aria-label="当前线路进度">
              <span>{activeRoute.number}</span>
              <div>
                {routePuzzles.map((item, index) => (
                  <i
                    aria-label={`${item.station.name}${solved.has(item.id) ? '已完成' : '未完成'}`}
                    data-active={index === activeIndex}
                    data-solved={solved.has(item.id)}
                    key={item.id}
                    title={item.station.name}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="routeRunway routeRunwayEmpty" aria-label="当前线路待导入">
              <span>{activeRoute.number}</span>
              <strong>这条线路还没有站点题目</strong>
            </div>
          )}

          {puzzle ? (
            <div className="reactBoardHost" ref={boardHostRef}>
              <ChessProblemBoard
                boardTheme={{
                  dark: activeRoute.boardDark,
                  drop: `rgba(${activeRoute.colorRgb}, 0.82)`,
                  light: activeRoute.boardLight,
                  notation: activeRoute.dark,
                }}
                boardWidth={boardWidth}
                customArrows={customArrows}
                customSquareStyles={customSquareStyles}
                isDraggablePiece={canDragPiece}
                onDragOverSquare={(square) => setHoverSquare(square)}
                onMouseOutSquare={(square) => {
                  if (hoverSquare === square) setHoverSquare(null);
                }}
                onMouseOverSquare={(square) => {
                  if (selectedSquare) setHoverSquare(square);
                }}
                onPieceDragBegin={handlePieceDragBegin}
                onPieceDragEnd={handlePieceDragEnd}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                orientation={orientation}
                position={position}
              />
            </div>
          ) : (
            <div className="emptyBoardState">
              <TrainFront aria-hidden="true" size={44} strokeWidth={2.2} />
              <strong>{activeRoute.name} 已在框架中</strong>
              <span>后续导入题库后，这里会显示该线路的站点闯关棋盘。</span>
            </div>
          )}
        </section>

        <aside className="detailPanel" aria-label="当前站点详情">
          {puzzle ? (
            <>
              <div className="detailHeader">
                <span>{puzzle.title}</span>
                <strong aria-label={`难度 ${puzzle.stars} 星`}>{difficultyStars(puzzle.stars)}</strong>
              </div>
              <div className="positionBox">
                <p>目标</p>
                <strong>{sideLabel(turn)}找到一步将杀</strong>
              </div>
              {puzzle.tags?.length ? (
                <div className="tagRow" aria-label="题目标签">
                  {puzzle.tags.slice(0, 5).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
              <div className="statusBox" data-tone={messageTone} role="status" aria-live="polite">
                {status}
              </div>
              <div className="metaGrid">
                <div className="moveBox">
                  <p>最近一步</p>
                  <strong>{lastMove ? lastMove.san : '尚未走子'}</strong>
                </div>
                <div className="moveBox">
                  <p>本题尝试</p>
                  <strong>{currentAttempts}</strong>
                </div>
              </div>
              {revealSolution && (
                <div className="solutionBox">
                  <p>答案</p>
                  <strong>{solutionLabel(puzzle)}</strong>
                </div>
              )}
              <div className="stationStory" data-locked={!stationUnlocked}>
                <div
                  className="stationPhoto"
                  style={{ background: puzzle.station.photoGradient }}
                  aria-hidden="true"
                >
                  <span>{activeRoute.number}</span>
                  {stationUnlocked ? (
                    <Sparkles size={28} strokeWidth={2.2} />
                  ) : (
                    <LockKeyhole size={28} />
                  )}
                  <strong>{puzzle.station.name}</strong>
                </div>
                {stationUnlocked ? (
                  <div className="stationCopy">
                    <p>站点介绍</p>
                    <strong>{puzzle.station.intro}</strong>
                    <p>有意思的故事</p>
                    <span>{puzzle.station.story}</span>
                    <p>周边探索</p>
                    <span>{puzzle.station.nearby}</span>
                  </div>
                ) : (
                  <div className="stationCopy">
                    <p>站点档案</p>
                    <strong>通关后解锁 {puzzle.station.name}</strong>
                    <span>走出一步杀后，会显示这个站点的介绍、故事和周边探索线索。</span>
                  </div>
                )}
              </div>
              <div className="promotionBox">
                <p>兵升变</p>
                <div className="promotionChoices" aria-label="兵升变选择">
                  {promotionChoices.map((choice) => (
                    <button
                      className={promotionChoice === choice.piece ? 'active' : ''}
                      key={choice.piece}
                      onClick={() => setPromotionChoice(choice.piece)}
                      type="button"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="primaryButton" onClick={nextPuzzle} type="button">
                下一站
                <ArrowRight aria-hidden="true" size={18} strokeWidth={2.4} />
              </button>
            </>
          ) : (
            <>
              <div className="detailHeader">
                <span>{activeRoute.subtitle}</span>
                <strong>{activeRoute.number}</strong>
              </div>
              <div className="statusBox" data-tone="neutral" role="status" aria-live="polite">
                {status}
              </div>
              <div className="stationStory" data-locked="true">
                <div
                  className="stationPhoto"
                  style={{
                    background: `linear-gradient(135deg, ${activeRoute.color}, ${activeRoute.dark})`,
                  }}
                  aria-hidden="true"
                >
                  <span>{activeRoute.number}</span>
                  <LockKeyhole size={28} />
                  <strong>{activeRoute.name}</strong>
                </div>
                <div className="stationCopy">
                  <p>线路框架</p>
                  <strong>等待导入这一线的站点题目</strong>
                  <span>{activeRoute.story}</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
