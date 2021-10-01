const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

export function getProjectedPosition(maze, current, direction, ignoreOffsets) {
  const { row, col, rowOffset, colOffset } = current;
  let nextRow = row;
  let nextCol = col;
  let nextRowOffset = rowOffset;
  let nextColOffset = colOffset;
  switch (direction) {
    case "up": {
      if (rowOffset === MIN_ROW_OFFSET || ignoreOffsets) {
        nextRow = row - 1;
        nextRowOffset = MAX_ROW_OFFSET;
      } else {
        nextRowOffset = rowOffset - 1;
      }
      break;
    }
    case "down": {
      if (rowOffset === MAX_ROW_OFFSET || ignoreOffsets) {
        nextRow = row + 1;
        nextRowOffset = 0;
      } else {
        nextRowOffset = rowOffset + 1;
      }

      break;
    }
    case "left": {
      if (colOffset === MIN_COL_OFFSET || ignoreOffsets) {
        nextCol = col - 1;
        nextColOffset = MAX_COL_OFFSET;
      } else {
        nextColOffset = colOffset - 1;
      }
      break;
    }
    case "right": {
      if (colOffset === MAX_COL_OFFSET || ignoreOffsets) {
        nextCol = col + 1;
        nextColOffset = MIN_COL_OFFSET;
      } else {
        nextColOffset = colOffset + 1;
      }
      break;
    }
    default: {
    }
  }

  // account for tunnels
  [nextRow, nextCol] = wrapAround(nextRow, nextCol, maze.numRows, maze.numCols);
  return {
    row: nextRow,
    col: nextCol,
    rowOffset: nextRowOffset,
    colOffset: nextColOffset,
  };
}

function wrapAround(nextRow, nextCol, numRows, numCols) {
  let wrappedRow = nextRow;
  let wrappedCol = nextCol;
  if (nextRow < 0) {
    wrappedRow = numRows - 1;
  }

  if (nextRow >= numRows) {
    wrappedRow = 0;
  }

  if (nextCol < 0) {
    wrappedCol = numCols - 1;
  }

  if (nextCol >= numCols) {
    wrappedCol = 0;
  }
  return [wrappedRow, wrappedCol];
}

export const isPositionWithinZone = (position, zone) => {
  return (
    zone.start.row <= position.row &&
    position.row <= zone.end.row &&
    zone.start.col <= position.col &&
    position.col <= zone.end.col
  );
};

export const getReverseDirection = (direction) => {
  const oppositeDirection = {
    left: "right",
    right: "left",
    up: "down",
    down: "up",
  };
  return oppositeDirection[direction];
};
