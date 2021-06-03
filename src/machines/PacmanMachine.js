import {
  createMachine,
  send,
  spawn,
  assign,
  actions,
  sendParent,
} from "xstate";
const { raise, respond } = actions;

const every = (...guards) => ({
  type: "every",
  guards,
});

let directions = ["up", "down", "left", "right"];

const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;

const getProjectedPosition = (current, direction, ignoreOffsets) => {
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

  return {
    row: nextRow,
    col: nextCol,
    rowOffset: nextRowOffset,
    colOffset: nextColOffset,
  };
};

const getNextPosition = (current, direction, maze) => {
  let projectedPosition = getProjectedPosition(current, direction);
  if (maze[projectedPosition.row][projectedPosition.col] !== "wall") {
    return projectedPosition;
  } else {
    return current;
  }
};

const getNextPositionWhileCornering = (position, corneringDirections) => {
  // when we are cornering we know we are moving within the same tile
  // we only need to update rowOffset and colOffset
  const { current, next } = corneringDirections;

  let rowOffsetDelta = 1;
  let colOffsetDelta = 1;

  // this logic uses that fact that turning invloves a 90 degree change of direction
  // if old == left then to can only be up or down
  if (current === "left") {
    colOffsetDelta = -1;
  } else if (current === "right") {
    colOffsetDelta = 1;
  }

  if (current === "up") {
    rowOffsetDelta = -1;
  } else if (current === "down") {
    rowOffsetDelta = 1;
  }

  if (next === "up") {
    rowOffsetDelta = -1;
  } else if (next === "down") {
    rowOffsetDelta = 1;
  }

  if (next === "left") {
    colOffsetDelta = -1;
  } else if (next === "right") {
    colOffsetDelta = 1;
  }

  const nextRowOffset = position.rowOffset + rowOffsetDelta;
  const nextColOffset = position.colOffset + colOffsetDelta;

  return { ...position, rowOffset: nextRowOffset, colOffset: nextColOffset };
};

const PACMAN_PIXELS_PER_SECOND_FULL_SPEED = 80;

const PacmanMachine = createMachine(
  {
    id: "pacman",
    initial: "moving",
    context: {
      position: {
        row: 8,
        col: 8,
        rowOffset: 4,
        colOffset: 4,
      },
      direction: "up",
      corneringDirections: {},
      requestedDirection: "up",
      nextPosition: {},
      speed: {},
      vals: [],
      subscription: {},
      maze: [],
      framesToSkip: 0,
      config: {
        speedPercentage: {
          frightened: 0.8,
          normal: 0.9,
        },
      },
    },
    on: {
      GAME_SYNC: { actions: ["respondWithUpdatedPosition"] },
    },
    states: {
      moving: {
        type: "parallel",
        on: {
          LEFT: {
            actions: [{ type: "requestDirection", direction: "left" }],
          },
          UP: {
            actions: [{ type: "requestDirection", direction: "up" }],
          },
          DOWN: {
            actions: [{ type: "requestDirection", direction: "down" }],
          },
          RIGHT: {
            actions: [{ type: "requestDirection", direction: "right" }],
          },
          LOSE_LIFE: {
            target: "dying",
          },
        },
        states: {
          movement: {
            id: "movement",
            initial: "normalMovement",
            invoke: {
              id: "tick",
              src: () => (callback) => {
                const interval = setInterval(() => {
                  callback("TICK");
                }, 2000);

                return () => {
                  clearInterval(interval);
                };
              },
            },
            states: {
              normalMovement: {
                id: "normalMovement",
                initial: "ready",
                states: {
                  ready: {
                    on: {
                      MOVE: {
                        target: "checkMovementType",
                        actions: ["updatePosition"],
                      },
                    },
                  },
                  checkMovementType: {
                    always: [
                      {
                        cond: every(
                          "turnRequested",
                          "pacmanTurningWouldNotCollideWithWall",
                          "pacmanTilePositionAllowsCornering"
                        ),
                        target: "#movement.cornering",
                        actions: ["setCorneringDirections"],
                      },
                      {
                        cond: every(
                          "turnRequested",
                          "pacmanTurningWouldNotCollideWithWall",
                          "pacmanTilePositionAllowsTurning"
                        ),
                        target: "#movement.turning",
                      },
                      { target: "ready" },
                    ],
                  },
                },
                on: {
                  START_CORNERING: {
                    target: "cornering",
                    actions: ["setCorneringDirections"],
                  },
                  START_TURNING: {
                    target: "turning",
                  },
                },
              },
              turning: {
                always: {
                  target: "normalMovement",
                  actions: ["turn"],
                },
              },
              cornering: {
                initial: "ready",
                states: {
                  ready: {
                    on: {
                      MOVE: {
                        target: "checkStillCornering",
                        actions: ["updatePositionWhileCornering"],
                      },
                    },
                  },
                  checkStillCornering: {
                    always: [
                      {
                        cond: "stillCornering",
                        target: "ready",
                      },
                      {
                        target: "#normalMovement",
                        actions: ["turn"],
                      },
                    ],
                  },
                },
              },
            },
          },
          pelletConsumption: {
            id: "pelletConsumption",
            on: {
              EAT_PELLET: {
                target: "#pelletConsumption.eatingPellet",
                actions: ["setFramesToSkipTo1"],
              },
              EAT_POWER_PELLET: {
                target: "#pelletConsumption.eatingPowerPellet",
                actions: ["setFramesToSkipTo3"],
              },
            },
            initial: "hungry",
            states: {
              hungry: {
                on: {
                  TICK: {
                    actions: ["allowMovement"],
                  },
                },
              },
              eatingPellet: {
                on: {
                  TICK: [
                    {
                      cond: "noMoreFramesToSkip",
                      actions: ["decrementFramesToSkip"],
                      target: "hungry",
                    },
                    {
                      actions: ["decrementFramesToSkip"],
                    },
                  ],
                },
              },
              eatingPowerPellet: {
                on: {
                  TICK: [
                    {
                      cond: "noMoreFramesToSkip",
                      actions: ["decrementFramesToSkip"],
                      target: "hungry",
                    },
                    {
                      actions: ["decrementFramesToSkip"],
                    },
                  ],
                },
              },
            },
          },
          speed: {
            initial: "regular",
            states: {
              regular: {
                on: {
                  FRIGHTENED: {
                    target: "frightened",
                  },
                },
                // invoke: {
                //   id: "tick",
                //   src: (ctx) => (callback) => {
                //     const updateRate =
                //       1000 /
                //       (ctx.config.speedPercentage.normal *
                //         PACMAN_PIXELS_PER_SECOND_FULL_SPEED);
                //     const interval = setInterval(() => {
                //       callback("TICK");
                //     }, 2000);

                //     return () => {
                //       clearInterval(interval);
                //     };
                //   },
                // },
              },
              frightened: {
                on: {
                  END_FRIGHT: {
                    target: "regular",
                  },
                },
                invoke: {
                  id: "tick",
                  src: (ctx) => (callback) => {
                    const updateRate =
                      1000 /
                      (ctx.config.speedPercentage.frightened *
                        PACMAN_PIXELS_PER_SECOND_FULL_SPEED);
                    console.log("update rate frightened", updateRate);
                    const interval = setInterval(() => {
                      callback("TICK");
                    }, 2000);

                    return () => {
                      clearInterval(interval);
                    };
                  },
                },
              },
            },
          },
        },
      },
      paused: {},
      dying: {
        after: {
          3000: {
            target: "waitingToRestart",
          },
        },
      },
      waitingToRestart: {
        on: {
          RESET_POSITION: {
            target: "moving",
            actions: ["clearFramesToSkip", "setPosition"],
          },
        },
      },
    },
  },
  {
    actions: {
      allowMovement: send({ type: "MOVE" }),
      turn: assign((ctx) => {
        return {
          ...ctx,
          direction: ctx.requestedDirection,
          requestedDirection: undefined,
        };
      }),
      requestDirection: assign({
        requestedDirection: (ctx, event, { action }) => {
          return action.direction;
        },
      }),
      clearFramesToSkip: assign({
        framesToSkip: 0,
      }),
      decrementFramesToSkip: assign({
        framesToSkip: (ctx) => ctx.framesToSkip - 1,
      }),
      setFramesToSkipTo3: assign({ framesToSkip: () => 3 }),
      setFramesToSkipTo1: assign({ framesToSkip: () => 1 }),
      updatePosition: assign({
        position: (ctx) =>
          getNextPosition(ctx.position, ctx.direction, ctx.maze, false),
      }),
      respondWithUpdatedPosition: sendParent((ctx) => {
        return {
          type: "UPDATE_POSITION",
          position: ctx.position,
          direction: ctx.direction,
          character: "pacman",
        };
      }),
      setPosition: assign({
        position: (ctx, event) => event.position,
      }),
      setCorneringDirections: assign({
        corneringDirections: (ctx) => ({
          current: ctx.direction,
          next: ctx.requestedDirection,
        }),
      }),
      updatePositionWhileCornering: assign({
        position: (ctx) =>
          getNextPositionWhileCornering(ctx.position, ctx.corneringDirections),
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
      turnRequested: (ctx) => {
        // a turn is a 90 degree change of direction e.g. up to left
        const { requestedDirection, direction } = ctx;

        console.log(direction, requestedDirection);
        if (direction === "up" || direction === "down") {
          return (
            requestedDirection === "left" || requestedDirection === "right"
          );
        }

        if (direction === "left" || direction === "right") {
          return requestedDirection === "up" || requestedDirection === "down";
        }
      },
      pacmanTilePositionAllowsTurning: (ctx) => {
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
      pacmanTilePositionAllowsCornering: (ctx) => {
        // pacman can corner if he is before the center of the current tile
        const { direction, position } = ctx;
        const { colOffset, rowOffset } = position;
        if (direction === "up") {
          return rowOffset > CENTER_ROW_OFFSET;
        }

        if (direction === "down") {
          return rowOffset < CENTER_ROW_OFFSET;
        }

        if (direction === "left") {
          return colOffset > CENTER_COL_OFFSET;
        }

        if (direction === "right") {
          return colOffset < CENTER_COL_OFFSET;
        }
      },
      pacmanTurningWouldNotCollideWithWall: (ctx) => {
        const { position, requestedDirection, maze } = ctx;
        const nextPosition = getProjectedPosition(
          position,
          requestedDirection,
          false
        );
        return maze[nextPosition.row][nextPosition.col] !== "wall";
      },
      stillCornering: (ctx) => {
        // we are still cornering if pacman is yet to reach the horizontal/vertical center
        const { corneringDirections, position } = ctx;
        const { colOffset, rowOffset } = position;
        const { next } = corneringDirections;
        if (next === "up" || next === "down") {
          return colOffset !== CENTER_COL_OFFSET;
        }

        if (next === "left" || next === "right") {
          return rowOffset !== CENTER_ROW_OFFSET;
        }
      },
    },
  }
);

export default PacmanMachine;
