import React, { useState, useEffect, useCallback } from 'react';

type Board = number[][];
const GRID_SIZE = 4;

const TILE_COLORS: { [key: number]: string } = {
  0: 'bg-gray-700',
  2: 'bg-gray-200 text-gray-800',
  4: 'bg-gray-300 text-gray-800',
  8: 'bg-yellow-500 text-white',
  16: 'bg-yellow-600 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-orange-600 text-white',
  128: 'bg-red-500 text-white',
  256: 'bg-red-600 text-white',
  512: 'bg-indigo-500 text-white',
  1024: 'bg-indigo-600 text-white',
  2048: 'bg-purple-600 text-white',
};

const getTileFontSize = (value: number): string => {
  if (value >= 10000) return 'text-xl';
  if (value >= 1000) return 'text-2xl';
  if (value >= 100) return 'text-3xl';
  return 'text-4xl';
};

// Helper components defined outside the main App to prevent re-creation on re-renders

interface TileProps {
  value: number;
}

const Tile: React.FC<TileProps> = ({ value }) => {
  const colorClass = TILE_COLORS[value] || 'bg-black text-white';
  const fontClass = getTileFontSize(value);
  const scale = value > 0 ? 'scale-100' : 'scale-0';

  return (
    <div
      className={`w-full h-full rounded-md flex items-center justify-center font-bold transition-transform duration-300 ${scale}`}
    >
      <div
        className={`w-full h-full flex items-center justify-center rounded-md ${colorClass} ${fontClass}`}
      >
        {value > 0 ? value : ''}
      </div>
    </div>
  );
};

interface BoardProps {
  board: Board;
}

const GameBoard: React.FC<BoardProps> = ({ board }) => {
  return (
    <div className="bg-gray-800 p-2 sm:p-4 rounded-lg">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {board.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-700 rounded-md"
            >
              <Tile value={value} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface GameOverOverlayProps {
  score: number;
  onRestart: () => void;
}

const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ score, onRestart }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10 animate-fade-in">
      <h2 className="text-5xl font-bold text-red-500 mb-4">Game Over!</h2>
      <p className="text-xl mb-6">Your score: {score}</p>
      <button
        onClick={onRestart}
        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg text-lg font-semibold transition-colors"
      >
        Try Again
      </button>
    </div>
  );
};


const App: React.FC = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [score, setScore] = useState(0);
  const [topScore, setTopScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const storedTopScore = localStorage.getItem('topScore2048');
    if (storedTopScore) {
      setTopScore(parseInt(storedTopScore, 10));
    }
  }, []);
  
  useEffect(() => {
    if (score > topScore) {
      setTopScore(score);
      localStorage.setItem('topScore2048', score.toString());
    }
  }, [score, topScore]);

  function createEmptyBoard(): Board {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  }

  const addRandomTile = (currentBoard: Board): Board => {
    const newBoard = currentBoard.map(row => [...row]);
    const emptyCells: { x: number; y: number }[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newBoard[i][j] === 0) {
          emptyCells.push({ x: i, y: j });
        }
      }
    }

    if (emptyCells.length > 0) {
      const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      newBoard[x][y] = Math.random() < 0.9 ? 2 : 4;
    }
    return newBoard;
  };

  const initGame = useCallback(() => {
    let newBoard = createEmptyBoard();
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const slideRowLeft = (row: number[]): { newRow: number[]; mergedScore: number } => {
    const filteredRow = row.filter(val => val !== 0);
    let newRow: number[] = [];
    let mergedScore = 0;

    for (let i = 0; i < filteredRow.length; i++) {
      if (i + 1 < filteredRow.length && filteredRow[i] === filteredRow[i + 1]) {
        const mergedValue = filteredRow[i] * 2;
        newRow.push(mergedValue);
        mergedScore += mergedValue;
        i++;
      } else {
        newRow.push(filteredRow[i]);
      }
    }

    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }
    return { newRow, mergedScore };
  };

  const rotateBoard = (currentBoard: Board): Board => {
    const newBoard = createEmptyBoard();
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        newBoard[i][j] = currentBoard[GRID_SIZE - 1 - j][i];
      }
    }
    return newBoard;
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    let tempBoard = board.map(row => [...row]);
    let totalMergedScore = 0;
    let rotations = 0;

    if (direction === 'up') rotations = 1;
    if (direction === 'right') rotations = 2;
    if (direction === 'down') rotations = 3;

    for (let i = 0; i < rotations; i++) {
      tempBoard = rotateBoard(tempBoard);
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      const { newRow, mergedScore } = slideRowLeft(tempBoard[i]);
      tempBoard[i] = newRow;
      totalMergedScore += mergedScore;
    }

    for (let i = 0; i < rotations; i++) {
      tempBoard = rotateBoard(rotateBoard(rotateBoard(tempBoard)));
    }
    
    const boardChanged = JSON.stringify(board) !== JSON.stringify(tempBoard);

    if (boardChanged) {
        const newBoardWithTile = addRandomTile(tempBoard);
        setBoard(newBoardWithTile);
        setScore(prev => prev + totalMergedScore);
        if (isGameOver(newBoardWithTile)) {
            setGameOver(true);
        }
    }
  }, [board, gameOver]);

  const isGameOver = (currentBoard: Board): boolean => {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (currentBoard[i][j] === 0) return false;
            if (i < GRID_SIZE - 1 && currentBoard[i][j] === currentBoard[i + 1][j]) return false;
            if (j < GRID_SIZE - 1 && currentBoard[i][j] === currentBoard[i][j + 1]) return false;
        }
    }
    return true;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        move('down');
        break;
      case 'ArrowDown':
        move('up');
        break;
      case 'ArrowLeft':
        move('left');
        break;
      case 'ArrowRight':
        move('right');
        break;
    }
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStart && e.changedTouches.length === 1) {
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.x;
        const dy = touchEnd.y - touchStart.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) > 30) { // minimum swipe distance
            if (absDx > absDy) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                // Natural swipe controls for mobile
                move(dy > 0 ? 'down' : 'up');
            }
        }
    }
    setTouchStart(null);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <header className="flex items-stretch justify-between w-full max-w-md mb-4 gap-2 sm:gap-3">
        <div className="p-2 flex items-center justify-center bg-yellow-500 rounded-lg">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">2048</h1>
        </div>
        <div className="px-6 py-2 bg-gray-800 rounded-lg text-center flex flex-col justify-center">
            <div className="text-base text-gray-400">SCORE</div>
            <div className="text-3xl font-bold">{score}</div>
        </div>
        <div className="px-6 py-2 bg-gray-800 rounded-lg text-center flex flex-col justify-center">
            <div className="text-base text-gray-400">BEST</div>
            <div className="text-3xl font-bold">{topScore}</div>
        </div>
        <button
          onClick={initGame}
          className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-colors text-sm sm:text-base flex items-center justify-center text-center"
        >
          New Game
        </button>
      </header>
      <main className="relative">
        {gameOver && <GameOverOverlay score={score} onRestart={initGame} />}
        <GameBoard board={board} />
      </main>
      <footer className="mt-4 text-center text-gray-500 max-w-md">
        <p>Use your arrow keys or swipe on your screen to move the tiles. When two tiles with the same number touch, they merge into one!</p>
        <p className="mt-2 text-sm">développé par Ezzir Abdelaali</p>
      </footer>
    </div>
  );
};

export default App;
