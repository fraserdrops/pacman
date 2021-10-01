import {
  createMachine,
  spawn,
  assign,
  actions,
  send,
  sendParent,
  forwardTo,
} from "xstate";
import {
  getProjectedPosition,
  getReverseDirection,
} from "../util/characterUtil";
import CharacterSpeedMachine from "./CharacterSpeedMachine";
import DirectionMachine from "./DirectionMachine";

const { raise, respond, choose } = actions;

const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;
const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

const every = (...guards) => ({
  type: "every",
  guards,
});

const GhostMovementMachine = createMachine(
  {
    id: "Movement",
    context: {
      position: undefined,
      maze: undefined,
      direction: "left",
      nextDirection: "left",
      targetTile: undefined,
      gameConfig: {},
    },
    on: {
      UPDATE_NEXT_DIRECTION: {
        actions: ["updateNextDirection"],
      },
      CHANGE_TARGET_TILE: {
        actions: ["setTargetTile"],
      },
      CHANGE_SPEED: {
        actions: [forwardTo("speed")],
      },
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
      ADD_RESTRICTED_DIRECTIONS: {
        actions: [forwardTo("direction")],
      },
      REMOVE_RESTRICTED_DIRECTIONS: {
        actions: [forwardTo("direction")],
      },
      ADD_FORBIDDEN_ZONE: {
        actions: [forwardTo("direction")],
      },
      REMOVE_FORBIDDEN_ZONE: {
        actions: [forwardTo("direction")],
      },
      IGNORE_DIRECTION_RESTRICTIONS: {
        actions: [forwardTo("direction")],
      },
      APPLY_DIRECTION_RESTRICTIONS: {
        actions: [forwardTo("direction")],
      },
    },
    invoke: [
      {
        src: CharacterSpeedMachine,
        id: "speed",
        data: {
          ...CharacterSpeedMachine.context,
          currentBaseInterval: (ctx, event) =>
            1000 /
            (ctx.gameConfig.speedPercentage.normal * ctx.gameConfig.baseSpeed),
          callbackEventName: "TICK",
        },
      },
      { src: DirectionMachine, id: "direction" },
    ],
    type: "parallel",
    states: {
      movementState: {
        initial: "stopped",
        states: {
          moving: {
            initial: "pattern",
            states: {
              pattern: {
                on: {
                  TICK: {
                    actions: [send("MOVE")],
                  },
                  START_REVERSING_SEQUENCE: {
                    target: "reversing",
                  },
                },
              },
              reversing: {
                initial: "idle",
                on: {
                  REVERSE_COMPLETE: {
                    target: "pattern",
                  },
                },
                states: {
                  idle: {
                    on: {
                      TICK: {
                        target: "updateDirection",
                        actions: ["setNextPosition", "forwardNextPosition"],
                      },
                    },
                  },
                  updateDirection: {
                    always: {
                      target: "idle",
                      actions: [
                        choose([
                          {
                            cond: every(
                              // "turningWouldNotCollideWithWall",
                              "atStartOfTile"
                            ),
                            // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                            // then looks ahead to choose a direction for when it reachs the next tile
                            actions: [
                              "reverseDirection",
                              "sendReversingFinished",
                            ],
                          },
                        ]),
                        "sendMovementFinished",
                      ],
                    },
                  },
                },
              },
            },
            on: {
              PAUSE: {
                target: "stopped",
                actions: ["pauseSpeed"],
              },
            },
          },
          stopped: {
            on: {
              RESUME: {
                target: "moving",
                actions: ["resumeSpeed"],
              },
            },
          },
        },
      },
      directionPattern: {
        initial: "tileStrobe",
        on: {
          SEEK_TARGET_TILE: {
            target: ".seekTargetTile",
          },
          RANDOM_MOVEMENT: {
            target: ".random",
          },
        },
        states: {
          tileStrobe: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  MOVE: {
                    target: "updateDirection",
                    actions: ["setNextPosition", "forwardNextPosition"],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "idle",
                  actions: [
                    choose([
                      {
                        cond: every(
                          // "turningWouldNotCollideWithWall",
                          "atEdgeOfTile"
                        ),
                        // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                        // then looks ahead to choose a direction for when it reachs the next tile
                        actions: ["reverseDirection"],
                      },
                    ]),
                    "sendMovementFinished",
                  ],
                },
              },
            },
          },
          seekTargetTile: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  MOVE: {
                    target: "updateDirection",
                    actions: ["setNextPosition", "forwardNextPosition"],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "idle",
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
                    "sendMovementFinished",
                  ],
                },
              },
            },
          },
          random: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  MOVE: {
                    target: "updateDirection",
                    actions: ["setNextPosition", "forwardNextPosition"],
                  },
                },
              },
              updateDirection: {
                always: {
                  target: "idle",
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
                          "chooseNextRandomDirection",
                        ],
                      },
                    ]),
                    "sendMovementFinished",
                  ],
                },
              },
            },
          },
        },
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
      get not() {
        return (ctx, event, { cond }) => {
          const { guard } = cond;
          return !this[guard](ctx, event);
        };
      },
      atEdgeOfTile: (ctx) => {
        // pacman can turn if he is at the center of the current tile
        const { direction, position } = ctx;
        const { colOffset, rowOffset } = position;
        if (direction === "up" || direction === "down") {
          return rowOffset === MIN_ROW_OFFSET || rowOffset === MAX_ROW_OFFSET;
        }

        if (direction === "left" || direction === "right") {
          return colOffset === MIN_COL_OFFSET || colOffset === MAX_COL_OFFSET;
        }
      },
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
      atStartOfTile: (ctx) => {
        // pacman can turn if he is at the center of the current tile
        const { direction, position } = ctx;
        const { colOffset, rowOffset } = position;
        if (direction === "up") {
          return rowOffset === MAX_ROW_OFFSET;
        }

        if (direction === "down") {
          return rowOffset === MIN_ROW_OFFSET;
        }

        if (direction === "left") {
          return colOffset === MAX_COL_OFFSET;
        }

        if (direction === "right") {
          return colOffset === MIN_COL_OFFSET;
        }
      },
    },
    actions: {
      sendMovementFinished: sendParent((ctx) => ({
        type: "MOVEMENT_FINISHED",
        targetTile: ctx.targetTile,
        position: ctx.position,
        direction: ctx.direction,
      })),
      sendReversingFinished: send("REVERSE_COMPLETE"),
      reverseDirection: assign({
        direction: (ctx) => getReverseDirection(ctx.direction),
        nextDirection: (ctx) => getReverseDirection(ctx.direction),
      }),
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
      chooseNextRandomDirection: send(
        (ctx, event) => {
          const { maze, position, direction, targetTile } = ctx;
          return {
            type: "CALCULATE_NEXT_RANDOM_DIRECTION",
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
      setTargetTile: assign({
        targetTile: (ctx, event) => event.targetTile,
      }),
      resumeSpeed: send("RESUME", { to: "speed" }),
      pauseSpeed: send("PAUSE", { to: "speed" }),
    },
  }
);

export default GhostMovementMachine;
