const ctx = require('axel');
const keypress = require('keypress');

// Message
const LABEL = 'SINGLE-DOUBLE-TRIPLE-TETRIS';

// Border outsize
const FRAME_WIDTH = 12;
const FRAME_HEIGHT = 22;
const FRAME_COLOR = [77, 139, 235];
const FRAME_X = 2;
const FRAME_Y = 2;
const FRAME = [];

// Inner frame (board game)
const INNER_FRAME_WIDTH = FRAME_WIDTH - 2;
const INNER_FRAME_HEIGHT = FRAME_HEIGHT - 2;
const INNER_FRAME_COLOR = [0, 0, 0];
const INNER_FRAME_X = FRAME_X + 2;
const INNER_FRAME_Y = FRAME_Y + 1; 
const INNER_FRAME = [];

// speed of the game
let SPEED = 500;
// interval update inner frame
let INTERVAL = null;
// current block to move Null => generate new one
let CURRENT_BLOCK = null;
// score
let SCORE = 0;

// all shape of blocks matrix
const SHAPE = {
  O: [
    [1, 1],
    [1, 1],
  ],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  I: [
    [1],
    [1],
    [1],
    [1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
}

// clear terminal
ctx.clear();

const getShapeWidth = (shape) => shape[0].length;

const getShapeHeight = (shape) => shape.length;

const randomRange = (f, t) => f + ~~(Math.random() * (t - f));

const randomColor = () => [randomRange(0, 255), randomRange(0, 255), randomRange(0, 255)];

// random shape of blocks
const randomShape = (color) => {
  const shapeNames = Object.keys(SHAPE);
  const shapeName = shapeNames[randomRange(0, shapeNames.length - 1)];
  return SHAPE[shapeName].map(r => r.map(rr => rr ? [...color] : 0));
}

// rotate matrix 90 degree
const rotateShape = (shape) => {
  // [1, 1, 1],    [0, 1]
  // [0, 1, 0], => [1, 1]
  //               [0, 1]
  const newColumnSize = shape[0].length;
  const newRowSize = shape.length;
  const newShape = [];
  for (let columnIndex = 0; columnIndex < newColumnSize; columnIndex++) {
    for (let rowIndex = 0; rowIndex < newRowSize; rowIndex++) {
      if (!newShape[columnIndex]) newShape[columnIndex] = [];
      newShape[columnIndex][rowIndex] = shape[rowIndex][columnIndex];
    }
  }
  return newShape.map(m => m.reverse());
}

const drawDot = (x, y, w = 2, h = 1, c) => {
  ctx.bg(...c);
  ctx.box(x, y, w, h);
}

const clearDot = (x, y, w = 2, h = 1) => drawDot(x, y, w, h, INNER_FRAME_COLOR);

const drawMatrix = (x, y, matrix) => {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const cellColor = row[columnIndex];
      if (cellColor) {
        drawDot(x + columnIndex * 2, y + rowIndex, 2, 1, cellColor);
      } else {
        clearDot(x + columnIndex * 2, y + rowIndex);
      }
    }
  }
}

// Out-size border
const drawFrame = () => {
  for (let i = 0; i < FRAME_HEIGHT; i++) {
    FRAME[i] = [];
    for (let j = 0; j < FRAME_WIDTH; j++) {
      if (i === 0 || i === FRAME_HEIGHT - 1 || j === 0 || j === FRAME_WIDTH - 1) {
        FRAME[i][j] = FRAME_COLOR;
      } else {
        FRAME[i][j] = 0;
      }
    }
  }
  drawMatrix(FRAME_X, FRAME_Y, FRAME);
}

// Init game board matrix
const initInnerFrame = () => {
  for (let i = 0; i < INNER_FRAME_HEIGHT; i++) {
    INNER_FRAME[i] = [];
    for (let j = 0; j < INNER_FRAME_WIDTH; j++) {
      INNER_FRAME[i][j] = 0;
    }
  }
}

const updateInnerFrame = () => drawMatrix(INNER_FRAME_X, INNER_FRAME_Y, INNER_FRAME);

const drawShape = ({ x, y, width, height, shape }) => {
  for (let rowIndex = 0; rowIndex < INNER_FRAME.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < INNER_FRAME[rowIndex].length; columnIndex++) {
      if (rowIndex >= y && rowIndex < y + height
        && columnIndex >= x && columnIndex < x + width) {
        if (shape[rowIndex - y][columnIndex - x])
          INNER_FRAME[rowIndex][columnIndex] = shape[rowIndex - y][columnIndex - x];
      }
    }
  }
  updateInnerFrame();
}

const removeShape = ({ x, y, width, height, shape }) => {
  for (let rowIndex = 0; rowIndex < INNER_FRAME.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < INNER_FRAME[rowIndex].length; columnIndex++) {
      if (rowIndex >= y && rowIndex < y + height
        && columnIndex >= x && columnIndex < x + width) {
        if (shape[rowIndex - y][columnIndex - x]) INNER_FRAME[rowIndex][columnIndex] = 0;
      }
    }
  }
  updateInnerFrame();
}

const scoreRow = () => {
  for (let rowIndex = 0; rowIndex < INNER_FRAME.length; rowIndex++) {
    const row = INNER_FRAME[rowIndex];
    if (row) {
      const isFull = row.findIndex(f => f === 0) === -1;

      if (isFull) {
        INNER_FRAME.splice(rowIndex, 1);
        INNER_FRAME.unshift([...new Array(INNER_FRAME_WIDTH)].map(f => 0));
        SCORE++;
      }
    }
  }
}

// loop render game
const drawGame = () => {
  if (!CURRENT_BLOCK) {
    const shape = randomShape(randomColor());
    CURRENT_BLOCK = {
      shape,
      width: getShapeWidth(shape),
      height: getShapeHeight(shape),
      x: ~~(INNER_FRAME_WIDTH / 2),
      y: 0,
    }
    if (!checkConflict(CURRENT_BLOCK)) endding();
    else drawShape(CURRENT_BLOCK);
  } else {
    if (!moveCurrentBlock(0, 1)) {
      // can not move down anymore spawn new block
      CURRENT_BLOCK = null;
      SCORE++;
      scoreRow();
      drawGame();
    } else {
      drawShape(CURRENT_BLOCK);
    }
  }
}

const start = () => {
  ctx.cursor.off();
  initInnerFrame();
  drawFrame();
  INTERVAL = setInterval(() => drawGame(), SPEED);
  process.stdin.setRawMode(true);
  keypress(process.stdin);
  process.stdin.resume();
}

const end = () => {
  process.stdin.pause();
  if (INTERVAL) clearInterval(INTERVAL);
  ctx.cursor.on();
  ctx.cursor.restore();
}

const endding = () => {
  for (let rowIndex = 0; rowIndex < INNER_FRAME.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < INNER_FRAME[rowIndex].length; columnIndex++) {
      INNER_FRAME[rowIndex][columnIndex] = INNER_FRAME_COLOR;
    }
  }
  updateInnerFrame();
  const text = `YOUR SCORE IS ${SCORE}!`;
  ctx.text(INNER_FRAME_WIDTH - text.length, INNER_FRAME_HEIGHT / 2, text);
  end();
}

const checkConflict = ({ x, y, width, height, shape }) => {
  let moveable = true;
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    for (let columnIndex = 0; columnIndex < width; columnIndex++) {
      if (shape[rowIndex][columnIndex] !== 0) {
        if (INNER_FRAME[y + rowIndex][x + columnIndex] !== 0) moveable = false;
      }
    }
  }
  return moveable;
}

// move
const moveCurrentBlock = (x, y) => {
  if (CURRENT_BLOCK) {
    const { shape, x: cX, y: cY, width, height } = CURRENT_BLOCK;
    if (x < 0 && cX === 0) return false;
    if (y < 0 && cY === 0) return false;
    // plus 1 for overlap
    if (x > 0 && cX + width + 1 > INNER_FRAME_WIDTH) return false;
    if (y > 0 && cY + height + 1 > INNER_FRAME_HEIGHT) return false;
    // check can move or not
    // clean shape from inner frame first
    removeShape(CURRENT_BLOCK);
    // move to next position
    CURRENT_BLOCK.x += x;
    CURRENT_BLOCK.y += y;
    // check conflict
    const moveable = checkConflict(CURRENT_BLOCK);
    // if can not move then go back prev position
    if (!moveable) {
      CURRENT_BLOCK.x -= x;
      CURRENT_BLOCK.y -= y;
    }
    drawShape(CURRENT_BLOCK);
    return moveable;
  }
}

// rotate
const rotateCurrentBlock = () => {
  if (CURRENT_BLOCK) {
    const { shape, y, x, height } = CURRENT_BLOCK;
    if (height + y < INNER_FRAME_HEIGHT) {
      removeShape(CURRENT_BLOCK);
      const newShape = rotateShape(shape);
      CURRENT_BLOCK.shape = newShape;
      CURRENT_BLOCK.width = getShapeWidth(newShape);
      CURRENT_BLOCK.height = getShapeHeight(newShape);
      // step back when rotate near outter line
      if (x + CURRENT_BLOCK.width > INNER_FRAME_WIDTH)
        CURRENT_BLOCK.x -= (x + CURRENT_BLOCK.width) - INNER_FRAME_WIDTH;
      if (y + CURRENT_BLOCK.height > INNER_FRAME_HEIGHT)
        CURRENT_BLOCK.y -= (y + CURRENT_BLOCK.height) - INNER_FRAME_HEIGHT;
      drawShape(CURRENT_BLOCK);
    }
  }
}

// event on keypress
process.stdin.on('keypress', (ch, key) => {
  if (key) {
    if (key.name == 'escape') endding();
    if (key.name == 'c' && key.ctrl) endding();
    if (key.name == 'left') moveCurrentBlock(-1, 0);
    if (key.name == 'right') moveCurrentBlock(1, 0);
    if (key.name == 'down') moveCurrentBlock(0, 1);
    if (key.name == 'space') rotateCurrentBlock();
  }
});

start();
