import {
  createMachine,
  spawn,
  assign,
  actions,
  send,
  sendParent,
} from "xstate";
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

const RED_ZONE_ROW = 14;
const RED_ZONE_START_COL = 12;
const RED_ZONE_END_COL = 14;

const not = (guard) => ({
  type: "not",
  guard,
});

const TickerMachine = createMachine({
  id: "ticker",
  initial: "ticking",
  context: {
    intervalMS: undefined,
    callbackEventName: "TICK",
  },
  states: {
    ticking: {
      invoke: {
        src: (ctx) => (callback) => {
          const interval = setInterval(() => {
            callback("TICK");
          }, ctx.intervalMS);
          return () => {
            clearInterval(interval);
          };
        },
      },
      on: {
        TICK: {
          actions: [sendParent((ctx) => ({ type: ctx.callbackEventName }))],
        },
        CHANGE_SPEED: {
          target: "ticking",
          internal: false,
          actions: [assign({ intervalMS: (ctx, event) => event.intervalMS })],
        },
      },
    },
  },
});

const SpeedMachine = createMachine(
  {
    id: "Speed",
    initial: "regularSpeed",
    context: {
      standardInterval: undefined,
      overridenInterval: undefined,
    },
    invoke: {
      src: TickerMachine,
      id: "speedTicker",
      data: {
        intervalMS: (ctx, event) => ctx.standardInterval,
        callbackEventName: "TICK",
      },
    },
    on: {
      TICK: {
        actions: [() => console.log("GHOST"), sendParent("TICK")],
      },
    },
    states: {
      regularSpeed: {
        on: {
          changeSpeedRegular: {
            actions: [
              "changeSpeed",
              assign({ standardInterval: (ctx, event) => event.intervalMS }),
            ],
          },
          OVERRIDE_SPEED: {
            target: "overridden",
            actions: [
              "changeSpeedOverridden",
              assign({ overridenInterval: (ctx, event) => event.intervalMS }),
            ],
          },
        },
      },
      overridden: {
        on: {
          OVERRIDE_SPEED: [
            {
              cond: "slowerSpeed",
              actions: [
                "changeSpeedOverridden",
                assign({ overridenInterval: (ctx, event) => event.intervalMS }),
              ],
            },
          ],
          CLEAR_OVERRIDE: {
            target: "regularSpeed",
            actions: ["changeSpeedRegular", () => console.log("YOZAYOZA")],
          },
        },
      },
    },
  },
  {
    guards: {
      slowerSpeed: (ctx, event) => event.intervalMS < ctx.overridenInterval,
    },
    actions: {
      changeSpeedOverridden: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.overridenInterval,
        }),
        { to: "speedTicker" }
      ),
      changeSpeedRegular: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.standardInterval,
        }),
        { to: "speedTicker" }
      ),
    },
  }
);

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
    initial: "stopped",
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
      restrictions: {
        speed: {},
        directions: {},
      },

      maze: [],
      gameConfig: {
        baseSpeed: 35,
        speedPercentage: {
          tunnel: 0.4,
          normal: 0.9,
          frightened: 0.5,
          returning: 2,
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
      stopped: {
        on: {
          GET_READY: {
            target: "ready",
          },
        },
      },
      ready: {
        tags: ["ready"],
        on: {
          START: {
            target: "playing",
          },
        },
      },
      playing: {
        type: "parallel",
        states: {
          // in the maze there are certain zones that affect the ghosts behaviour
          restrictedZones: {
            initial: "none",
            type: "parallel",
            states: {
              tunnel: {
                initial: "outside",
                states: {
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        // { cond: "inTunnel", target: "inside" },
                      ],
                    },
                  },
                  inside: {
                    entry: ["applyTunnelRestrictions"],
                    exit: ["removeTunnelRestrictions"],
                    on: {
                      MOVEMENT_FINISHED: [
                        // { cond: not("inTunnel"), target: "outside" },
                      ],
                    },
                  },
                },
              },
              redZone: {
                initial: "outside",
                states: {
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        { cond: "inRedZone", target: "inside" },
                      ],
                    },
                  },
                  inside: {
                    entry: [
                      "applyRedZoneRestrictions",
                      send(
                        { type: "OVERRIDE_SPEED", intervalMS: 100 },
                        { to: "speed" }
                      ),
                    ],
                    exit: ["removeRedZoneRestrictions"],
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: not("inRedZone"),
                          target: "outside",
                          actions: [
                            send({ type: "CLEAR_OVERRIDE" }, { to: "speed" }),
                          ],
                        },
                      ],
                    },
                  },
                },
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
                    actions: ["setNextPosition", "sendMovementFinished"],
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
                tags: ["movementPaused"],
                on: {
                  RESUME: {
                    target: "idle",
                  },
                },
              },
            },
          },
          speed: {
            invoke: {
              src: SpeedMachine,
              id: "speed",
              data: {
                standardInterval: (ctx, event) =>
                  1000 /
                  (ctx.gameConfig.speedPercentage.normal *
                    ctx.gameConfig.baseSpeed),
                callbackEventName: "TICK",
              },
            },
          },

          direction: {
            states: {
              unrestricted: {},
              restricted: {},
            },
          },
          chaseStatus: {
            initial: "normal",
            id: "chaseStatus",
            on: {},
            states: {
              atHome: {
                on: {
                  LEAVE_HOME: {
                    target: "leavingHome",
                  },
                },
              },
              leavingHome: {
                on: {
                  MOVEMENT_FINISHED: {
                    target: "normal",
                  },
                },
              },
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
                    entry: [
                      send(
                        (ctx) => ({
                          type: "CHANGE_SPEED",
                          intervalMS:
                            ctx.gameConfig.speedPercentage.normal *
                            ctx.gameConfig.baseSpeed,
                        }),
                        { to: "speed" }
                      ),
                    ],
                    on: {
                      SCATTER: {
                        target: "scatter",
                      },
                      TICK: {
                        actions: ["updateTargetTileNormalMode"],
                      },
                    },
                  },
                  scatter: {
                    entry: [
                      "setTargetTileScatterMode",
                      send(
                        (ctx) => ({
                          type: "CHANGE_SPEED",
                          intervalMS:
                            ctx.gameConfig.speedPercentage.normal *
                            ctx.gameConfig.baseSpeed,
                        }),
                        { to: "speed" }
                      ),
                    ],

                    on: {
                      CHASE: {
                        target: "scatter",
                      },
                    },
                  },
                },
              },
              frightened: {
                initial: "frightStarted",
                entry: [
                  send(
                    (ctx) => ({
                      type: "CHANGE_SPEED",
                      intervalMS:
                        ctx.gameConfig.speedPercentage.frightened *
                        ctx.gameConfig.baseSpeed,
                    }),
                    { to: "speed" }
                  ),
                ],
                states: {
                  frightStarted: {
                    tags: ["frightStarted"],
                    on: {
                      FRIGHT_ENDING_SOON: {
                        target: "frightEnding",
                      },
                    },
                  },
                  frightEnding: {
                    tags: ["frightEnding"],
                  },
                },
                on: {
                  END_FRIGHT: {
                    target: "normal",
                  },
                  DIED: {
                    target: "dead",
                  },
                  FRIGHTENED: {
                    target: "frightened",
                    internal: false,
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
                initial: "ideal",
                tags: ["returningHome"],
                entry: [
                  send(
                    (ctx) => ({
                      type: "CHANGE_SPEED",
                      intervalMS:
                        ctx.gameConfig.speedPercentage.returning *
                        ctx.gameConfig.baseSpeed,
                    }),
                    { to: "ticker" }
                  ),
                ],
                states: {
                  ideal: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: "reachedHomeTile",
                          target: "#chaseStatus.normal.hist",
                        },
                      ],
                    },
                  },
                  waitingScatter: {
                    MOVEMENT_FINISHED: [
                      {
                        cond: "reachedHomeTile",
                        target: "#chaseStatus.scatter",
                      },
                    ],
                  },
                  waitingChase: {
                    MOVEMENT_FINISHED: [
                      {
                        cond: "reachedHomeTile",
                        target: "#chaseStatus.chase",
                      },
                    ],
                  },
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
      sendMovementFinished: send("MOVEMENT_FINISHED"),

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
      get not() {
        return (ctx, event, { cond }) => {
          const { guard } = cond;
          console.log("NONTONOT", this[guard](ctx, event));
          return !this[guard](ctx, event);
        };
      },
      reachedHomeTile: (ctx) => {
        const { homeTile } = ctx.ghostConfig;
        return (
          homeTile.row === ctx.position.row && homeTile.col === ctx.position.col
        );
      },
      noMoreFramesToSkip: (ctx) => ctx.framesToSkip === 1,
      canChangeDirection: (ctx) => {
        const { position } = ctx;
        return position.rowOffset === 4 && position.colOffset === 4;
      },
      inRedZone: (ctx) => {
        const { position } = ctx;
        return (
          position.row === RED_ZONE_ROW &&
          RED_ZONE_START_COL <= position.col &&
          position.col <= RED_ZONE_END_COL
        );
      },
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
