import {
  createMachine,
  send,
  spawn,
  assign,
  actions,
  sendParent,
  forwardTo,
} from "xstate";
import { getTileType } from "../shared/maze";
import { Howl, Howler } from "howler";
import CharacterSpeedMachine from "./CharacterSpeedMachine";
import { getProjectedPosition } from "../util/characterUtil";

const { raise, respond, choose } = actions;

const every = (...guards) => ({
  type: "every",
  guards,
});

const not = (guard) => ({
  type: "not",
  guard,
});

let directions = ["up", "down", "left", "right"];

const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;

const getNextPosition = (current, direction, maze) => {
  let projectedPosition = getProjectedPosition(maze, current, direction);
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

const PacmanSpeedMachine = createMachine(
  {
    id: "PacmanSpeed",
    context: {
      framesToSkip: 0,
      speed: 1000,
      currentBaseInterval: 100,
    },
    on: {
      "*": {
        actions: [forwardTo("speed")],
      },
      SKIP_FRAMES: {
        target: ".skipFrames",
        actions: ["setFramesToSkip"],
      },
    },
    invoke: {
      src: CharacterSpeedMachine,
      id: "speed",
      data: {
        ...CharacterSpeedMachine.context,
        currentBaseInterval: (ctx, event) => ctx.currentBaseInterval,
        callbackEventName: "TICK",
      },
    },
    initial: "fullSpeed",
    states: {
      fullSpeed: {
        on: {
          TICK: {
            actions: [sendParent({ type: "TICK" })],
          },
        },
      },
      skipFrames: {
        on: {
          TICK: [
            {
              cond: "noMoreFramesToSkip",
              actions: ["decrementFramesToSkip"],
              target: "fullSpeed",
            },
            {
              actions: ["decrementFramesToSkip"],
            },
          ],
        },
      },
    },
  },
  {
    actions: {
      setFramesToSkip: assign({
        framesToSkip: (ctx, event) => event.framesToSkip,
      }),
      decrementFramesToSkip: assign({
        framesToSkip: (ctx) => ctx.framesToSkip - 1,
      }),
    },
    guards: {
      noMoreFramesToSkip: (ctx) => ctx.framesToSkip === 1,
    },
  }
);

// on: {
//   '*': [
//     { target: 'place', cond: (_, e) => e.type === 'NEXT' }
//   ]
// }

const MovementMachine = createMachine(
  {
    id: "movement",
    context: {
      position: undefined,
      maze: undefined,
      direction: "left",
      nextDirection: "left",
      requestedDirection: undefined,
      config: {},
    },
    on: {
      REQUEST_CHANGE_DIRECTION: {
        actions: ["requestDirection"],
      },
      UPDATE_NEXT_DIRECTION: {
        actions: ["updateNextDirection"],
      },
      // PAUSE: {
      //   target: ".paused",
      // },
      REMOVE_SPECIAL_SPEED: {
        actions: [forwardTo("speed")],
      },
      SPECIAL_SPEED: {
        actions: [forwardTo("speed")],
      },
      CLEAR_SPEED_OVERRIDE: {
        actions: [forwardTo("speed")],
      },
      OVERRIDE_SPEED: {
        actions: [forwardTo("speed")],
      },
      CHANGE_DIRECTION: {},
      SKIP_FRAMES: {
        actions: [forwardTo("speed")],
      },
      PAUSE: {
        actions: [forwardTo("speed")],
      },
      RESUME: {
        actions: [forwardTo("speed")],
      },
    },
    invoke: {
      src: PacmanSpeedMachine,
      id: "speed",
      data: {
        currentBaseInterval: (ctx, event) =>
          1000 / (ctx.config.speedPercentage.normal * ctx.config.baseSpeed),
        callbackEventName: "TICK",
      },
    },
    initial: "normalMovement",
    states: {
      normalMovement: {
        id: "normalMovement",
        initial: "ready",
        states: {
          ready: {
            on: {
              TICK: {
                target: "checkMovementType",
                actions: ["updatePosition", "respondWithUpdatedPosition"],
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
                cond: every("pacmanInCenterOfTile", "pacmanWillHitWall"),
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
              TICK: {
                target: "checkStillCornering",
                actions: [
                  "updatePositionWhileCornering",
                  "respondWithUpdatedPosition",
                ],
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
                actions: ["completeCorneringTurn"],
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
        initial: "ready",
        entry: [sendParent("WALLED")],
        states: {
          ready: {
            on: {
              TICK: {
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
                cond: every("pacmanInCenterOfTile", "pacmanWillHitWall"),
                target: "#movement.walled",
              },
              { target: "#normalMovement.ready" },
            ],
          },
        },
        exit: [sendParent("UNWALLED")],
      },
    },
  },
  {
    guards: {
      get every() {
        return (ctx, event, { cond }) => {
          const { guards } = cond;
          return guards.every((guardKey) => this[guardKey](ctx, event));
        };
      },
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
        let projectedPosition = getProjectedPosition(
          maze,
          position,
          direction,
          true
        );
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
          maze,
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
    actions: {
      sendMovementFinished: sendParent((ctx) => ({
        type: "MOVEMENT_FINISHED",
        position: ctx.position,
        direction: ctx.direction,
      })),
      chooseNextDirection: send(
        (ctx, event) => {
          const { maze, position, direction, targetTile } = ctx;
          return {
            type: "CALCULATE_NEXT_DIRECTION",
            maze,
            position,
            direction,
            targetTile,
          };
        },
        { to: "direction" }
      ),
      forwardNextPosition: sendParent((ctx) => {
        return {
          type: "UPDATE_POSITION",
          position: ctx.position,
          direction: ctx.direction,
        };
      }),
      switchToNextDirection: assign({
        direction: (ctx) => ctx.nextDirection,
      }),
      updateNextDirection: assign({
        nextDirection: (ctx, event) => event.nextDirection,
      }),
      setNextPosition: assign({
        position: (ctx) =>
          getProjectedPosition(ctx.maze, ctx.position, ctx.direction),
      }),
      turn: assign((ctx) => {
        return {
          ...ctx,
          direction: ctx.requestedDirection,
          requestedDirection: undefined,
        };
      }),
      // we can't just use the 'turn' action, because request direction could change while we are cornering. So we need to use
      // the direction that was requested at the start of cornering, saved as next in corneringDirections
      completeCorneringTurn: assign((ctx) => {
        return {
          ...ctx,
          direction: ctx.corneringDirections.next,
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
        requestedDirection: (ctx, event) => {
          return event.direction;
        },
      }),
      updatePosition: assign({
        position: (ctx) => {
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
  }
);

const PacmanMachine = createMachine(
  {
    id: "pacman",
    context: {
      position: {
        row: 1,
        col: 1,
        rowOffset: 4,
        colOffset: 4,
      },
      direction: "left",
      corneringDirections: {},
      requestedDirection: "left",
      nextPosition: {},
      speed: {},
      vals: [],
      subscription: {},
      maze: [],
      framesToSkip: 0,
      config: {
        baseSpeed: 50,
        speedPercentage: {
          frightened: 0.8,
          normal: 0.9,
        },
      },
    },
    type: "parallel",
    states: {
      core: {
        initial: "ready",
        on: {
          GAME_SYNC: {
            actions: ["respondWithUpdatedPosition"],
          },
        },
        states: {
          ready: {
            on: {
              START: {
                target: "playing",
              },
            },
          },
          playing: {
            invoke: {
              src: MovementMachine,
              id: "movement",
              data: {
                position: (ctx, event) => ctx.position,
                direction: (ctx, event) => ctx.direction,
                config: (ctx, event) => ctx.config,
                maze: (ctx, event) => ctx.maze,
                nextDirection: (ctx, event) => ctx.nextDirection,
              },
            },
            entry: ["resumeMovement", send("RESUME")],
            on: {
              LEFT: {
                actions: ["requestDirectionLeft"],
              },
              UP: {
                actions: ["requestDirectionUp"],
              },
              DOWN: {
                actions: ["requestDirectionDown"],
              },
              RIGHT: {
                actions: ["requestDirectionRight"],
              },
              EAT_PELLET: {
                actions: ["setFramesToSkipTo1"],
              },
              EAT_POWER_PELLET: {
                actions: ["setFramesToSkipTo3"],
              },
              UPDATE_POSITION: {
                actions: ["updatePacmanPosition"],
              },
              PAUSE: {
                actions: [send("PAUSE", { to: "movement" })],
              },
              LOSE_LIFE: {
                target: "dead",
              },
              RESUME: {
                actions: [send("RESUME", { to: "movement" })],
              },
            },
          },
          dead: {
            on: {
              RESET_POSITION: {
                target: "ready",
                actions: ["setPosition", "setDirection"],
              },
            },
          },
          waitingToRestart: {},
        },
      },
      view: {
        initial: "stationary",
        on: {
          HIDE_PACMAN: {
            target: ".hidden",
          },
          LOSE_LIFE: {
            target: ".dying",
          },
        },
        states: {
          stationary: {
            tags: ["stationary"],
            on: {
              UNWALLED: {
                target: "moving",
              },
              RESUME: {
                target: "moving",
              },
            },
          },
          moving: {
            tags: ["moving"],
            on: {
              WALLED: {
                target: "stationary",
              },
              PAUSE: {
                target: "stationary",
              },
            },
          },
          hidden: {
            tags: ["frightPaused"],
          },
          dying: {
            tags: ["dying"],
            on: {
              RESET_POSITION: {
                target: "stationary",
              },
            },
          },
        },
      },
      audio: {
        on: {
          EAT_PELLET: {
            actions: [
              () => {
                var sound = new Howl({
                  src: "https://vgmsite.com/soundtracks/pac-man-game-sound-effects/knwtmadt/Chomp.mp3",
                  html5: true, // A live stream can only be played through HTML5 Audio.
                  format: ["mp3", "aac"],
                });
                sound.play();
              },
            ],
          },
        },
      },
    },
  },
  {
    actions: {
      updatePacmanPosition: assign((ctx, event) => {
        return {
          ...ctx,
          direction: event.direction,
          position: event.position,
        };
      }),
      resumeMovement: send("RESUME", { to: "movement" }),
      requestDirectionLeft: send(
        { type: "REQUEST_CHANGE_DIRECTION", direction: "left" },
        { to: "movement" }
      ),
      requestDirectionRight: send(
        { type: "REQUEST_CHANGE_DIRECTION", direction: "right" },
        { to: "movement" }
      ),
      requestDirectionUp: send(
        { type: "REQUEST_CHANGE_DIRECTION", direction: "up" },
        { to: "movement" }
      ),
      requestDirectionDown: send(
        { type: "REQUEST_CHANGE_DIRECTION", direction: "down" },
        { to: "movement" }
      ),
      setFramesToSkipTo1: send(
        { type: "SKIP_FRAMES", framesToSkip: 1 },
        { to: "movement" }
      ),
      setFramesToSkipTo3: send(
        { type: "SKIP_FRAMES", framesToSkip: 3 },
        { to: "movement" }
      ),
      updatePosition: assign({
        position: (ctx) => {
          return getNextPosition(ctx.position, ctx.direction, ctx.maze, false);
        },
      }),
      setDirection: assign({
        direction: (ctx, event) => event.direction,
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
      changeToFrightSpeed: send((ctx) => ({
        type: "CHANGE_SPEED",
        intervalMS:
          ctx.config.speedPercentage.frightened * ctx.config.baseSpeed,
      })),
      changeToNormalSpeed: send((ctx) => ({
        type: "CHANGE_SPEED",
        intervalMS: ctx.config.speedPercentage.normal * ctx.config.baseSpeed,
      })),
    },
    guards: {
      get every() {
        return (ctx, event, { cond }) => {
          const { guards } = cond;
          return guards.every((guardKey) => this[guardKey](ctx, event));
        };
      },
      get not() {
        return (ctx, event, { cond }) => {
          const { guard } = cond;
          return !this[guard](ctx, event);
        };
      },
    },
  }
);

export default PacmanMachine;
