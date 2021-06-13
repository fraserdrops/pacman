import { createMachine, spawn, assign, actions } from "xstate";
import { getTileType } from "../shared/maze";
const { raise, respond, choose } = actions;

let directions = ["up", "left", "down", "right"];

const getProjectedPosition = (current, direction, ignoreOffsets) => {
  const { row, col, rowOffset, colOffset } = current;
  let nextRow = row;
  let nextCol = col;
  let nextRowOffset = rowOffset;
  let nextColOffset = colOffset;
  switch (direction) {
    case "up": {
      if (rowOffset === 0 || ignoreOffsets) {
        nextRow = row - 1;
        nextRowOffset = 7;
      } else {
        nextRowOffset = rowOffset - 1;
      }
      break;
    }
    case "down": {
      if (rowOffset === 7 || ignoreOffsets) {
        nextRow = row + 1;
        nextRowOffset = 0;
      } else {
        nextRowOffset = rowOffset + 1;
      }

      break;
    }
    case "left": {
      if (colOffset === 0 || ignoreOffsets) {
        nextCol = col - 1;
        nextColOffset = 7;
      } else {
        nextColOffset = colOffset - 1;
      }
      break;
    }
    case "right": {
      if (colOffset === 7 || ignoreOffsets) {
        nextCol = col + 1;
        nextColOffset = 0;
      } else {
        nextColOffset = colOffset + 1;
      }
      break;
    }
    default: {
    }
  }

  return {
    row: nextRow,
    col: nextCol,
    rowOffset: nextRowOffset,
    colOffset: nextColOffset,
  };
};

const euclideanDistance = (x1, y1, x2, y2) =>
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

const GhostMachine = createMachine(
  {
    id: "ghostMachine",
    initial: "playing",
    context: {
      character: undefined,
      position: {
        row: 1,
        col: 1,
        rowOffset: 4,
        colOffset: 4,
      },
      targetTile: {
        row: 1,
        col: 1,
      },
      direction: "up",
      scatterModeTile: {},
      nextDirection: "up",
      nextPosition: {},
      speed: {},
      gameState: {},
      subscription: {},
      maze: [],
      ghostBehaviour: undefined,
    },
    states: {
      playing: {
        initial: "normal",
        states: {
          normal: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  GAME_SYNC: {
                    target: "updateDirection",
                    actions: [
                      "setNextPosition",
                      "respondWithUpdatedPosition",
                      "updateGameState",
                    ],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "idle",
                  actions: [
                    choose([
                      {
                        cond: "canChangeDirection",
                        // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                        // then looks ahead to choose a direction for when it reachs the next tile
                        actions: [
                          "switchToNextDirection",
                          "updateTargetTileNormalMode",
                          "chooseNextDirection",
                        ],
                      },
                    ]),
                  ],
                },
              },
            },
          },
          scatter: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  GAME_SYNC: {
                    target: "updateDirection",
                    actions: [
                      "setNextPosition",
                      "respondWithUpdatedPosition",
                      "updateGameState",
                    ],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "idle",
                  actions: [
                    choose([
                      {
                        cond: "canChangeDirection",
                        // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                        // then looks ahead to choose a direction for when it reachs the next tile
                        actions: [
                          "switchToNextDirection",
                          "updateTargetTileScatterMode",
                          "chooseNextDirection",
                        ],
                      },
                    ]),
                  ],
                },
              },
            },
          },
        },
      },
      dying: {},
    },
    on: {
      RESET_POSITION: {
        target: "playing",
        actions: ["setPosition"],
      },
    },
  },
  {
    actions: {
      setNextPosition: assign({
        position: (ctx) => getProjectedPosition(ctx.position, ctx.direction),
      }),
      respondWithUpdatedPosition: respond((ctx) => {
        return {
          type: "UPDATE_POSITION",
          position: ctx.position,
          direction: ctx.direction,
          character: ctx.character,
        };
      }),
      setPosition: assign({
        position: (ctx, event) => event.position,
      }),
      updateGameState: assign({
        gameState: (ctx, event) => event.gameState,
      }),
      chooseNextDirection: assign({
        nextDirection: (ctx) => {
          // the ghosts look one tile ahead and choose what direction they will take when they get to the next tile
          const { maze, position, direction, targetTile } = ctx;
          let validDirections = [...directions];
          let nextDirection = "up";
          const nextPosition = getProjectedPosition(
            { direction, row: position.row, col: position.col },
            true
          );

          if (direction === "up") {
            validDirections = validDirections.filter(
              (direction) => direction !== "down"
            );
          }

          if (direction === "down") {
            validDirections = validDirections.filter(
              (direction) => direction !== "up"
            );
          }

          if (direction === "right") {
            validDirections = validDirections.filter(
              (direction) => direction !== "left"
            );
          }

          validDirections = validDirections.filter((direction) => {
            const projectedPosition = getProjectedPosition(
              { direction, row: nextPosition.row, col: nextPosition.col },
              true
            );
            return getTileType(maze.tiles, projectedPosition) !== "wall";
          });

          if (validDirections.length > 1) {
            // we choose the direction that moves us closer to the target tile
            // need to find the projected position for each valid direction we could choose
            const distanceToTargetIfDirectionChosen = validDirections.map(
              (direction) => {
                const projectedPosition = getProjectedPosition(
                  { direction, row: nextPosition.row, col: nextPosition.col },
                  true
                );
                return euclideanDistance(
                  projectedPosition.row,
                  projectedPosition.col,
                  targetTile.row,
                  targetTile.col
                );
              }
            );

            let directionsWithShortestDistance = [];
            let shortestDistance = Number.MAX_SAFE_INTEGER;
            distanceToTargetIfDirectionChosen.forEach((distance, index) => {
              if (distance < shortestDistance) {
                directionsWithShortestDistance = [validDirections[index]];
                shortestDistance = distance;
              } else if (distance === shortestDistance) {
                directionsWithShortestDistance.push(validDirections[index]);
              }
            });

            if (directionsWithShortestDistance.length > 1) {
              // go through directions in order of priority (up left down right), and choose the first match
              for (let direction of directions) {
                if (directionsWithShortestDistance.includes(direction)) {
                  nextDirection = direction;
                  break;
                }
              }
            } else {
              nextDirection = directionsWithShortestDistance[0];
            }
          } else {
            nextDirection = validDirections[0];
          }
          return nextDirection;
        },
      }),
      switchToNextDirection: assign({
        direction: (ctx) => ctx.nextDirection,
      }),
    },
    guards: {
      noMoreFramesToSkip: (ctx) => ctx.framesToSkip === 1,
      canChangeDirection: (ctx) => {
        const { position } = ctx;
        return position.rowOffset === 4 && position.colOffset === 4;
      },
    },
  }
);

export default GhostMachine;
