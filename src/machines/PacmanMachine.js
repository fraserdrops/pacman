import {
  createMachine,
  send,
  spawn,
  assign,
  actions,
  sendParent,
} from "xstate";
import { getTileType } from "../shared/maze";
import { Howl, Howler } from "howler";

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
  return projectedPosition;
};

const getNextPositionWhileCornering = (position, corneringDirections) => {
  // when we are cornering we know we are moving within the same tile
  // we only need to update rowOffset and colOffset
  const { current, next } = corneringDirections;

  let rowOffsetDelta = 1;
  let colOffsetDelta = 1;
  let rowDelta = 0;
  let colDelta = 0;

  // this logic uses that fact that turning invloves a 90 degree change of direction
  // if old == left then to can only be up or down
  if (current === "left" || next === "left") {
    colOffsetDelta = -1;
  } else if (current === "right" || next === "right") {
    colOffsetDelta = 1;
  }

  if (current === "up" || next === "up") {
    rowOffsetDelta = -1;
  } else if (current === "down" || next === "down") {
    rowOffsetDelta = 1;
  }

  let nextRowOffset = position.rowOffset + rowOffsetDelta;
  let nextColOffset = position.colOffset + colOffsetDelta;

  if (position.rowOffset + rowOffsetDelta < MIN_ROW_OFFSET) {
    rowDelta = -1;
    nextRowOffset = MAX_ROW_OFFSET;
  } else if (position.rowOffset + rowOffsetDelta > MAX_ROW_OFFSET) {
    nextRowOffset = MIN_ROW_OFFSET;
    rowDelta = 1;
  }

  if (position.colOffset + colOffsetDelta < MIN_COL_OFFSET) {
    nextColOffset = MAX_COL_OFFSET;
    colDelta = -1;
  } else if (position.colOffset + colOffsetDelta > MAX_COL_OFFSET) {
    nextColOffset = MIN_COL_OFFSET;
    colDelta = 1;
  }

  const nextRow = position.row + rowDelta;
  const nextCol = position.col + colDelta;

  return {
    ...position,
    row: nextRow,
    col: nextCol,
    rowOffset: nextRowOffset,
    colOffset: nextColOffset,
  };
};

const PACMAN_PIXELS_PER_SECOND_FULL_SPEED = 80;

const PacmanMachine = createMachine(
  {
    id: "pacman",
    initial: "moving",
    context: {
      position: {
        row: 1,
        col: 1,
        rowOffset: 4,
        colOffset: 4,
      },
      direction: "down",
      corneringDirections: {},
      requestedDirection: "down",
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
        tags: ["moving"],
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
          PAUSE: {
            target: "paused",
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
                }, 100);

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
                          "pacmanInCenterOfTile"
                        ),
                        target: "#movement.turning",
                      },
                      {
                        cond: "reverseRequested",
                        target: "#movement.reversing",
                      },
                      {
                        cond: every(
                          "pacmanInCenterOfTile",
                          "pacmanWillHitWall"
                        ),
                        target: "#movement.walled",
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
              reversing: {
                always: {
                  target: "normalMovement",
                  actions: ["reverse"],
                },
              },
              walled: {
                tags: ["walled"],
                initial: "ready",
                states: {
                  ready: {
                    on: {
                      MOVE: {
                        target: "checkMovementType",
                      },
                    },
                  },
                  checkMovementType: {
                    always: [
                      {
                        cond: every(
                          "turnRequested",
                          "pacmanTurningWouldNotCollideWithWall",
                          "pacmanInCenterOfTile"
                        ),
                        target: "#movement.turning",
                      },
                      {
                        cond: "reverseRequested",
                        target: "#movement.reversing",
                      },
                      {
                        cond: every(
                          "pacmanInCenterOfTile",
                          "pacmanWillHitWall"
                        ),
                        target: "#movement.walled",
                      },
                      { target: "#normalMovement.ready" },
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
                actions: [
                  "setFramesToSkipTo1",
                  () => {
                    var sound = new Howl({
                      src: "https://vgmsite.com/soundtracks/pac-man-game-sound-effects/knwtmadt/Chomp.mp3",
                      html5: true, // A live stream can only be played through HTML5 Audio.
                      format: ["mp3", "aac"],
                    });
                    console.log("audio", sound);
                    sound.play();
                  },
                ],
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
                invoke: {
                  id: "tick",
                  src: (ctx) => (callback) => {
                    const updateRate =
                      1000 /
                      (ctx.config.speedPercentage.normal *
                        PACMAN_PIXELS_PER_SECOND_FULL_SPEED);
                    const interval = setInterval(() => {
                      callback("TICK");
                    }, 50);

                    return () => {
                      clearInterval(interval);
                    };
                  },
                },
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
                    const interval = setInterval(() => {
                      callback("TICK");
                    }, 50);

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
      paused: {
        on: {
          LOSE_LIFE: {
            target: "dying",
          },
        },
      },
      dying: {
        tags: ["dying"],
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
      reverse: assign((ctx) => {
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
        position: (ctx) => {
          console.log(
            "YOUYOYO",
            getNextPosition(ctx.position, ctx.direction, ctx.maze, false)
          );
          return getNextPosition(ctx.position, ctx.direction, ctx.maze, false);
        },
      }),
      respondWithUpdatedPosition: sendParent((ctx) => {
        return {
          type: "UPDATE_POSITION",
          position: ctx.position,
          direction: ctx.direction,
          requestedDirection: ctx.requestedDirection,
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
        if (direction === "up" || direction === "down") {
          return (
            requestedDirection === "left" || requestedDirection === "right"
          );
        }

        if (direction === "left" || direction === "right") {
          return requestedDirection === "up" || requestedDirection === "down";
        }
      },
      reverseRequested: (ctx) => {
        // a turn is a 90 degree change of direction e.g. up to left
        const { requestedDirection, direction } = ctx;
        let oppositeDirections = {
          up: "down",
          down: "up",
          left: "right",
          right: "left",
        };

        return direction === oppositeDirections[requestedDirection];
      },
      pacmanInCenterOfTile: (ctx) => {
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
      pacmanWillHitWall: (ctx) => {
        const { position, direction, maze } = ctx;
        let projectedPosition = getProjectedPosition(position, direction, true);
        return getTileType(maze.tiles, projectedPosition) === "wall";
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
          true
        );
        return (
          getTileType(maze.tiles, nextPosition) !== "wall" &&
          getTileType(maze.tiles, nextPosition) !== "houseEntrance"
        );
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
