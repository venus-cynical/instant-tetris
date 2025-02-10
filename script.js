const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 24;

let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;
let score = 0;
let gameInterval = null;
let isPaused = false;

const COLORS = [
    '#00ffff', // シアン (I)
    '#0088ff', // ライトブルー (O)
    '#0044ff', // ブルー (T)
    '#00ccff', // スカイブルー (L)
    '#0066ff', // コバルトブルー (J)
    '#00aaff', // アクアブルー (S)
    '#0055ff'  // エレクトリックブルー (Z)
];

const TETROMINOS = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]]  // Z
];

function createPiece() {
    const type = Math.floor(Math.random() * TETROMINOS.length);
    const piece = TETROMINOS[type];
    return {
        shape: piece,
        x: Math.floor((BOARD_WIDTH - piece[0].length) / 2),
        y: 0,
        color: COLORS[type]
    };
}

function drawBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    // Draw fixed blocks
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                const block = document.createElement('div');
                block.className = 'tetromino';
                block.style.left = x * BLOCK_SIZE + 'px';
                block.style.top = y * BLOCK_SIZE + 'px';
                block.style.background = `linear-gradient(45deg, ${board[y][x]}, ${adjustBrightness(board[y][x], 40)})`;
                block.style.borderColor = adjustBrightness(board[y][x], 60);
                gameBoard.appendChild(block);
            }
        }
    }
    
    // Draw current piece
    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const block = document.createElement('div');
                    block.className = 'tetromino';
                    block.style.left = (currentPiece.x + x) * BLOCK_SIZE + 'px';
                    block.style.top = (currentPiece.y + y) * BLOCK_SIZE + 'px';
                    block.style.background = `linear-gradient(45deg, ${currentPiece.color}, ${adjustBrightness(currentPiece.color, 40)})`;
                    block.style.borderColor = adjustBrightness(currentPiece.color, 60);
                    gameBoard.appendChild(block);
                }
            });
        });
    }
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = (num >> 16) + percent;
    const g = ((num >> 8) & 0x00FF) + percent;
    const b = (num & 0x0000FF) + percent;
    return '#' + (0x1000000 + (r < 255 ? r : 255) * 0x10000 + (g < 255 ? g : 255) * 0x100 + (b < 255 ? b : 255)).toString(16).slice(1);
}

function isValidMove(piece, offsetX, offsetY) {
    return piece.shape.every((row, y) => {
        return row.every((value, x) => {
            const newX = piece.x + x + offsetX;
            const newY = piece.y + y + offsetY;
            return (
                value === 0 ||
                (newX >= 0 &&
                newX < BOARD_WIDTH &&
                newY < BOARD_HEIGHT &&
                (newY < 0 || board[newY][newX] === 0))
            );
        });
    });
}

function drawPreviewPiece(piece, element, blockSize = 18) {
    if (!piece) {
        element.innerHTML = '';
        return;
    }

    element.innerHTML = '';
    const offsetX = (element.offsetWidth - piece.shape[0].length * blockSize) / 2;
    const offsetY = (element.offsetHeight - piece.shape.length * blockSize) / 2;

    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const block = document.createElement('div');
                block.className = 'preview-tetromino';
                block.style.left = offsetX + x * blockSize + 'px';
                block.style.top = offsetY + y * blockSize + 'px';
                block.style.width = blockSize + 'px';
                block.style.height = blockSize + 'px';
                block.style.background = `linear-gradient(45deg, ${piece.color}, ${adjustBrightness(piece.color, 40)})`;
                block.style.borderColor = adjustBrightness(piece.color, 60);
                element.appendChild(block);
            }
        });
    });
}

function holdCurrentPiece() {
    if (!canHold || !currentPiece) return;

    const holdElement = document.getElementById('hold-piece');
    const tempPiece = {
        shape: currentPiece.shape,
        color: currentPiece.color
    };

    if (!holdPiece) {
        holdPiece = tempPiece;
        currentPiece = nextPiece;
        nextPiece = createPiece();
    } else {
        const temp = holdPiece;
        holdPiece = tempPiece;
        currentPiece = {
            shape: temp.shape,
            x: Math.floor((BOARD_WIDTH - temp.shape[0].length) / 2),
            y: 0,
            color: temp.color
        };
    }

    canHold = false;
    drawPreviewPiece(holdPiece, holdElement);
    drawPreviewPiece(nextPiece, document.getElementById('next-piece'));
    drawBoard();
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });
    canHold = true;
}

function clearLines() {
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            score += 100;
            document.getElementById('score').textContent = score;
        }
    }
}

function gameLoop() {
    if (!currentPiece) {
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawPreviewPiece(nextPiece, document.getElementById('next-piece'));
        if (!isValidMove(currentPiece, 0, 0)) {
            gameOver();
            return;
        }
    }

    if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
    } else {
        mergePiece();
        clearLines();
        currentPiece = null;
    }

    drawBoard();
}

async function gameOver() {
    clearInterval(gameInterval);
    
    // ゲームオーバーエフェクトを実行
    const gameBoard = document.getElementById('game-board');
    const blocks = gameBoard.getElementsByClassName('tetromino');
    
    // すべてのブロックに同時に消滅エフェクトを適用
    Array.from(blocks).forEach(block => {
        block.classList.add('disappearing');
    });
    
    // アニメーション完了を待ってからアラートを表示
    await new Promise(resolve => setTimeout(resolve, 600));
    alert('ゲームオーバー！ スコア: ' + score);
}

function startGame() {
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    document.getElementById('score').textContent = score;
    currentPiece = createPiece();
    nextPiece = createPiece();
    holdPiece = null;
    canHold = true;
    isPaused = false;
    document.getElementById('pause-btn').textContent = '一時停止';
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 500);
    
    // 初期表示
    drawPreviewPiece(nextPiece, document.getElementById('next-piece'));
    drawPreviewPiece(holdPiece, document.getElementById('hold-piece'));
}

function togglePause() {
    if (!gameInterval) return; // ゲームが開始されていない場合は何もしない
    
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    
    if (isPaused) {
        clearInterval(gameInterval);
        gameInterval = null;
        pauseBtn.textContent = '再開';
    } else {
        gameInterval = setInterval(gameLoop, 500);
        pauseBtn.textContent = '一時停止';
    }
}

document.addEventListener('keydown', (e) => {
    if (!currentPiece || isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            if (isValidMove(currentPiece, -1, 0)) {
                currentPiece.x--;
                drawBoard();
            }
            break;
        case 'ArrowRight':
            if (isValidMove(currentPiece, 1, 0)) {
                currentPiece.x++;
                drawBoard();
            }
            break;
        case 'ArrowDown':
            if (isValidMove(currentPiece, 0, 1)) {
                currentPiece.y++;
                drawBoard();
            }
            break;
        case 'ArrowUp':
            const rotated = {
                shape: currentPiece.shape[0].map((_, i) =>
                    currentPiece.shape.map(row => row[i]).reverse()
                ),
                x: currentPiece.x,
                y: currentPiece.y
            };
            if (isValidMove(rotated, 0, 0)) {
                currentPiece.shape = rotated.shape;
                drawBoard();
            }
            break;
        case ' ': // スペースキー
            while (isValidMove(currentPiece, 0, 1)) {
                currentPiece.y++;
                score += 1; // ハードドロップのボーナススコア
            }
            document.getElementById('score').textContent = score;
            drawBoard();
            break;
        case 'Shift': // HOLDキー
            holdCurrentPiece();
            break;
    }
}); 