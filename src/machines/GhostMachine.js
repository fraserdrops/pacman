import { createMachine, spawn, assign, actions, send } from "xstate";
import { getTileType } from "../shared/maze";
const { raise, respond, choose } = actions;

let directions = ["up", "left", "down", "right"];

const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;

const every = (...guards) => ({
  type: "every",
  guards,
});

const CreateTicker = (intervalMS, callbackEventName) => {
  return () => (callback) => {
    const interval = setInterval(() => {
      callback(callbackEventName);
    }, intervalMS);
    return () => {
      clearInterval(interval);
    };
  };
};

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

const normalSpeed = 50;
const scatterSpeed = 30;
const frightSpeed = 100;
const returningSpeed = 20;

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
      scatterTargetTile: {
        row: 15,
        col: 15,
      },
      direction: "up",
      scatterModeTile: {},
      nextDirection: "up",
      nextPosition: {},
      speed: {},
      gameState: {},
      subscription: {},
      maze: [],
      gameConfig: {
        speedPercentage: {
          tunnel: 0.4,
          normal: 0.9,
        },
      },

      ghostConfig: {
        scatterTargetTile: {
          row: 15,
          col: 15,
        },
        targetTile: {
          row: 1,
          col: 1,
        },
      },

      ghostBehaviour: undefined,
    },
    on: {
      GAME_SYNC: {
        actions: ["respondWithUpdatedPosition", "updateGameState"],
      },
      RESET_POSITION: {
        target: "playing",
        actions: ["setPosition"],
      },

      HIDE_DISPLAY: {
        target: "hidden",
      },
    },
    states: {
      playing: {
        type: "parallel",

        states: {
          // in the maze there are certain zones that affect the ghosts behaviour
          zone: {
            initial: "none",
            states: {
              on: {
                NO_ZONE: {
                  target: "none",
                },
                IN_TUNNEL: {
                  target: "tunnel",
                },
                IN_RED_ZONE: {
                  target: "redZone",
                },
              },
              none: {},
              redZone: {
                entry: ["applyRedZoneRestrictions"],
                exit: ["removeRedZoneRestrictions"],
              },
              tunnel: {
                entry: ["applyTunnelRestrictions"],
                exit: ["removeTunnelRestrictions"],
              },
            },
          },
          movement: {
            initial: "idle",
            on: {
              PAUSE: {
                target: ".paused",
              },
            },

            states: {
              idle: {
                on: {
                  TICK: {
                    target: "updateDirection",
                    actions: ["setNextPosition"],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "checkZone",
                  actions: [
                    choose([
                      {
                        cond: every(
                          // "turningWouldNotCollideWithWall",
                          "inCenterOfTile"
                        ),
                        // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                        // then looks ahead to choose a direction for when it reachs the next tile
                        actions: [
                          "switchToNextDirection",
                          "chooseNextDirection",
                        ],
                      },
                    ]),
                  ],
                },
              },
              checkZone: {
                always: [
                  {
                    target: "idle",
                    actions: [
                      choose([
                        {
                          cond: every(
                            // "turningWouldNotCollideWithWall",
                            "inRedZone"
                          ),
                          // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                          // then looks ahead to choose a direction for when it reachs the next tile

                          actions: [send("IN_RED_ZONE")],
                        },
                      ]),
                    ],
                  },
                ],
              },
              paused: {
                on: {
                  RESUME: {
                    target: "idle",
                  },
                },
              },
            },
          },
          chaseMode: {
            initial: "normal",
            on: {},
            states: {
              normal: {
                tags: ["normal"],
                initial: "chase",
                on: {
                  FRIGHTENED: {
                    target: "frightened",
                  },
                },
                states: {
                  hist: {
                    type: "history",
                  },
                  chase: {
                    on: {
                      SCATTER: {
                        target: "scatter",
                        actions: ["setTargetTileScatterMode"],
                      },
                      TICK: {
                        actions: ["updateTargetTileNormalMode"],
                      },
                    },
                    invoke: {
                      id: "tick",
                      src: CreateTicker(normalSpeed, "TICK"),
                    },
                  },
                  scatter: {
                    invoke: {
                      id: "tick",
                      src: CreateTicker(scatterSpeed, "TICK"),
                    },
                  },
                },
              },
              frightened: {
                tags: ["frightened"],
                invoke: {
                  id: "tick",
                  src: CreateTicker(frightSpeed, "TICK"),
                  FRIGHTENED: {
                    target: "frightened",
                  },
                },
                on: {
                  END_FRIGHT: {
                    target: "normal",
                  },
                  DIED: {
                    target: "dead",
                  },
                },
              },
              dead: {
                tags: ["dead"],
                on: {
                  RESUME: {
                    target: "returningHome",
                    actions: ["setHomeTargetTile"],
                  },
                },
              },
              returningHome: {
                tags: ["returningHome"],
                invoke: {
                  id: "tick",
                  src: CreateTicker(returningSpeed, "TICK"),
                },
              },
            },
          },
        },
      },
      paused: {},
      hidden: {
        tags: ["hidden"],
      },
      dying: {},
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
          nextDirection: ctx.nextDirection,
        };
      }),
      setPosition: assign({
        position: (ctx, event) => event.position,
      }),
      setTargetTileScatterMode: assign({
        targetTile: (ctx) => ctx.ghostConfig.scatterTargetTile,
      }),
      updateTargetTileNormalMode: assign({
        targetTile: (ctx) => ctx.ghostConfig.targetTile,
      }),
      setHomeTargetTile: assign({
        targetTile: (ctx) => ctx.ghostConfig.homeTile,
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
            direction,
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
              { row: nextPosition.row, col: nextPosition.col },
              direction,
              true
            );
            const currentTileType = getTileType(maze.tiles, position);

            return getTileType(maze.tiles, projectedPosition) !== "wall";
          });
          if (validDirections.length > 1) {
            // we choose the direction that moves us closer to the target tile
            // need to find the projected position for each valid direction we could choose
            const distanceToTargetIfDirectionChosen = validDirections.map(
              (direction) => {
                const projectedPosition = getProjectedPosition(
                  { row: nextPosition.row, col: nextPosition.col },
                  direction,
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
      get every() {
        return (ctx, event, { cond }) => {
          const { guards } = cond;
          return guards.every((guardKey) => this[guardKey](ctx, event));
        };
      },
      noMoreFramesToSkip: (ctx) => ctx.framesToSkip === 1,
      canChangeDirection: (ctx) => {
        const { position } = ctx;
        return position.rowOffset === 4 && position.colOffset === 4;
      },
      inRedZone: () => true,
      // turningWouldNotCollideWithWall: (ctx) => {
      //   const { position, requestedDirection, maze } = ctx;
      //   const nextPosition = getProjectedPosition(
      //     position,
      //     requestedDirection,
      //     true
      //   );
      //   return true;
      //   return getTileType(maze.tiles, nextPosition) !== "wall";
      // },
      inCenterOfTile: (ctx) => {
        // pacman can turn if he is at the center of the current tile
        const { direction, position } = ctx;
        const { colOffset, rowOffset } = position;
        if (direction === "up" || direction === "down") {
          return rowOffset === CENTER_ROW_OFFSET;
        }

        if (direction === "left" || direction === "right") {
          return colOffset === CENTER_COL_OFFSET;
        }
      },
    },
  }
);

export default GhostMachine;
