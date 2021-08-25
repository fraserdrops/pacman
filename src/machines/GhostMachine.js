import {
  createMachine,
  spawn,
  assign,
  actions,
  send,
  sendParent,
  forwardTo,
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
const RED_ZONE_START_COL = 11;
const RED_ZONE_END_COL = 13;

const not = (guard) => ({
  type: "not",
  guard,
});

const tileToString = ({ row, col }) => {
  return `row${row}col${col}`;
};

const chooseNextDirection = ({
  maze,
  position,
  direction,
  targetTile,
  restrictedTiles,
  restrictedDirections,
}) => {
  // the ghosts look one tile ahead and choose what direction they will take when they get to the next tile
  let validDirections = [...directions].filter(
    (direction) => !restrictedDirections.includes(direction)
  );
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
    validDirections = validDirections.filter((direction) => direction !== "up");
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
    const isWall = getTileType(maze.tiles, projectedPosition) === "wall";
    const isRestrictedTile = restrictedTiles[tileToString(nextPosition)];
    return !isWall && !isRestrictedTile;
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
};

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

const SimpleSpeedMachine = createMachine(
  {
    id: "Speed",
    initial: "applySpeedMultipliers",
    context: {
      currentBaseInterval: 1000,
      specialSpeedMultipliers: {},
      standardInterval: 1000,
    },
    invoke: {
      src: TickerMachine,
      id: "speedTicker",
      data: {
        intervalMS: (ctx, event) => ctx.currentBaseInterval,
        callbackEventName: "TICK",
      },
    },
    on: {
      TICK: {
        actions: [sendParent("TICK")],
      },
    },
    states: {
      applySpeedMultipliers: {
        on: {
          CHANGE_SPEED: {
            actions: [
              assign({ currentBaseInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedWithMultipliers",
            ],
          },
          OVERRIDE_SPEED_MULTIPLIERS: {
            target: "ignoreMultipliers",
            actions: ["changeSpeedOverridden"],
          },
          SPECIAL_SPEED: {
            actions: [
              "addSpecialSpeedMultiplierToList",
              "changeSpeedWithMultipliers",
            ],
          },
          REMOVE_SPECIAL_SPEED: {
            actions: [
              "removeSpecialSpeedMultiplierFromList",
              "changeSpeedWithMultipliers",
            ],
          },
        },
      },
      ignoreMultipliers: {
        on: {
          APPLY_SPEED_MULTIPLIERS: {
            target: "applySpeedMultipliers",
            actions: ["changeSpeedWithMultipliers"],
          },
          SPECIAL_SPEED: {
            actions: ["addSpecialSpeedMultiplierToList"],
          },
          CHANGE_SPEED: {
            actions: [
              assign({ currentBaseInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedOverridden",
            ],
          },
          REMOVE_SPECIAL_SPEED: {
            actions: ["removeSpecialSpeedMultiplierFromList"],
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
      changeSpeedWithMultipliers: send(
        (ctx, event) => {
          let intervalMS = ctx.currentBaseInterval;
          Object.values(ctx.specialSpeedMultipliers).forEach(
            (multiplier) => (intervalMS = intervalMS / multiplier)
          );
          return {
            type: "CHANGE_SPEED",
            intervalMS,
          };
        },
        { to: "speedTicker" }
      ),
      changeSpeedOverridden: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.currentBaseInterval,
        }),
        { to: "speedTicker" }
      ),
      addSpecialSpeedMultiplierToList: assign({
        specialSpeedMultipliers: (ctx, event) => {
          return {
            ...ctx.specialSpeedMultipliers,
            [event.specialKey]: event.specialMultiplier,
          };
        },
      }),
      removeSpecialSpeedMultiplierFromList: assign({
        specialSpeedMultipliers: (ctx, event) => {
          let newMulitpliers = { ...ctx.specialSpeedMultipliers };
          delete newMulitpliers[event.specialKey];
          return newMulitpliers;
        },
      }),
    },
  }
);

const DirectionMachine = createMachine(
  {
    id: "Direction",
    initial: "applyDirectionRestrictions",
    context: {
      restrictedTiles: {},
      restrictedDirections: [],
    },
    on: {
      ADD_RESTRICTED_TILES: {
        actions: ["addRestrictedTiles"],
      },
      REMOVE_RESTRICTED_TILES: {
        actions: ["removeRestrictedTiles"],
      },
      ADD_RESTRICTED_DIRECTIONS: {
        actions: ["addRestrictedDirections"],
      },
      REMOVE_RESTRICTED_DIRECTIONS: {
        actions: ["removeRestrictedDirections"],
      },
    },
    states: {
      applyDirectionRestrictions: {
        on: {
          CALCULATE_NEXT_DIRECTION: {
            actions: ["chooseDirectionsWithRestrictions"],
          },
        },
      },
      ignoreDirectionRestrictions: {
        on: {
          CLEAR_OVERRIDE: {
            target: "applyDirectionRestrictions",
            actions: ["changeSpeedWithMultipliers"],
          },
          CALCULATE_NEXT_DIRECTION: {
            actions: ["chooseDirectionsNoRestrictions"],
          },
        },
      },
    },
  },
  {
    actions: {
      chooseDirectionsWithRestrictions: sendParent((ctx, event) => {
        const { maze, position, direction, targetTile } = event;
        const { restrictedDirections, restrictedTiles } = ctx;
        const nextDirection = chooseNextDirection({
          maze,
          position,
          direction,
          targetTile,
          restrictedDirections,
          restrictedTiles,
        });

        return { type: "UPDATE_NEXT_DIRECTION", nextDirection };
      }),
      chooseDirectionsNoRestrictions: sendParent((ctx, event) => {
        const { maze, position, direction, targetTile } = event;
        const nextDirection = chooseNextDirection({
          maze,
          position,
          direction,
          targetTile,
          restrictedDirections: [],
          restrictedTiles: {},
        });

        return { type: "UPDATE_NEXT_DIRECTION", nextDirection };
      }),
      addRestrictedTiles: assign({
        restrictedTiles: (ctx, event) => {
          const restrictedTiles = { ...ctx.restrictedTiles };
          event.tiles.forEach(
            (tile) => (restrictedTiles[tileToString(event.tile)] = tile)
          );
          return restrictedTiles;
        },
      }),
      removeRestrictedTiles: assign({
        restrictedTiles: (ctx, event) => {
          const newRestrictedTiles = { ...ctx.restrictedTiles };
          event.tiles.forEach(
            (tile) => delete newRestrictedTiles[tileToString(tile)]
          );
          return newRestrictedTiles;
        },
      }),
      addRestrictedDirections: assign({
        restrictedDirections: (ctx, event) => {
          return [...ctx.restrictedDirections, ...event.directions];
        },
      }),
      removeRestrictedDirections: assign({
        restrictedDirections: (ctx, event) => {
          return ctx.restrictedDirections.filter(
            (direction) => !event.directions.includes(direction)
          );
        },
      }),
    },
  }
);

const MovementMachine = createMachine(
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
      ENTER_RED_ZONE: {
        actions: ["applyRedZoneRestrictions"],
      },
      EXIT_RED_ZONE: {
        actions: ["removeRedZoneRestrictions"],
      },
      UPDATE_NEXT_DIRECTION: {
        actions: ["updateNextDirection"],
      },
      PAUSE: {
        target: ".paused",
      },
      CHANGE_TARGET_TILE: {
        actions: [
          "setTargetTile",
          (ctx, event) => console.log("SET TARGET TILE", event),
        ],
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
      ADD_RESTRICTED_TILES: {
        actions: [forwardTo("direction")],
      },
      REMOVE_RESTRICTED_TILES: {
        actions: [forwardTo("direction")],
      },
    },
    invoke: [
      {
        src: SimpleSpeedMachine,
        id: "speed",
        data: {
          currentBaseInterval: (ctx, event) =>
            1000 /
            (ctx.gameConfig.speedPercentage.normal * ctx.gameConfig.baseSpeed),
          callbackEventName: "TICK",
        },
      },
      { src: DirectionMachine, id: "direction" },
    ],
    initial: "init",
    states: {
      init: {
        initial: "requestDirection",
        states: {
          requestDirection: {
            always: {
              target: "waitingForDirection",
              actions: ["chooseNextDirection"],
            },
          },
          waitingForDirection: {
            on: {
              UPDATE_NEXT_DIRECTION: {
                target: "recievedDirection",
                actions: ["updateNextDirection"],
              },
            },
          },
          recievedDirection: {
            type: "final",
          },
        },
        onDone: {
          target: "idle",
        },
      },
      idle: {
        on: {
          TICK: {
            target: "updateDirection",
            actions: [
              "setNextPosition",
              "forwardNextPosition",
              "sendMovementFinished",
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
                cond: every(
                  // "turningWouldNotCollideWithWall",
                  "inCenterOfTile"
                ),
                // when the ghost reaches the center of a tile, it switches to using the next direction it calculated a tile ago,
                // then looks ahead to choose a direction for when it reachs the next tile
                actions: ["switchToNextDirection", "chooseNextDirection"],
              },
            ]),
            "sendMovementFinished",
          ],
        },
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
    actions: {
      sendMovementFinished: sendParent((ctx) => ({
        type: "MOVEMENT_FINISHED",
        targetTile: ctx.targetTile,
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
        return { type: "UPDATE_POSITION", position: ctx.position };
      }),
      switchToNextDirection: assign({
        direction: (ctx) => ctx.nextDirection,
      }),
      updateNextDirection: assign({
        nextDirection: (ctx, event) => event.nextDirection,
      }),
      setNextPosition: assign({
        position: (ctx) => getProjectedPosition(ctx.position, ctx.direction),
      }),
      setTargetTile: assign({
        targetTile: (ctx, event) => event.targetTile,
      }),
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
        on: { UPDATE_POSITION: { actions: ["setPosition"] } },
        invoke: {
          src: MovementMachine,
          id: "movement",
          data: {
            position: (ctx, event) => ctx.position,
            nextDirection: (ctx, event) => ctx.position,
            targetTile: (ctx, event) => ctx.ghostConfig.targetTile,
            maze: (ctx, event) => ctx.maze,
            direction: (ctx, event) => ctx.direction,
            gameConfig: (ctx) => ctx.gameConfig,
          },
        },
        states: {
          // in the maze there are certain zones that affect the ghosts behaviour
          zones: {
            type: "parallel",
            states: {
              targetTile: {
                initial: "init",
                states: {
                  init: {
                    always: [
                      {
                        cond: "onTargetTile",
                        target: "inside",
                        actions: ["sendOnTargetTile"],
                      },
                      {
                        target: "outside",
                        actions: [""],
                      },
                    ],
                  },
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: "onTargetTile",
                          target: "inside",
                          actions: ["sendOnTargetTile"],
                        },
                      ],
                    },
                  },
                  inside: {
                    entry: ["sendOnTargetTile"],
                    exit: [""],
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: not("onTargetTile"),
                          target: "outside",
                          actions: [""],
                        },
                      ],
                    },
                  },
                },
              },
              ghostHouse: {
                initial: "init",
                states: {
                  init: {
                    always: [
                      {
                        cond: "inGhostHouse",
                        target: "inside",
                        actions: ["sendInsideGhostHouse"],
                      },
                      {
                        target: "outside",
                        actions: ["sendOutsideGhostHouse"],
                      },
                    ],
                  },
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: "inGhostHouse",
                          target: "inside",
                          actions: ["sendInsideGhostHouse"],
                        },
                      ],
                    },
                  },
                  inside: {
                    entry: ["sendInsideGhostHouse"],
                    exit: ["sendOutsideGhostHouse"],
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: not("inGhostHouse"),
                          target: "outside",
                          actions: ["sendOutsideGhostHouse"],
                        },
                      ],
                    },
                  },
                },
              },
              tunnel: {
                initial: "init",
                states: {
                  init: {
                    always: [
                      {
                        cond: "inTunnel",
                        target: "inside",
                        actions: ["applyTunnelRestrictions"],
                      },
                      {
                        target: "outside",
                        actions: [],
                      },
                    ],
                  },
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: "inTunnel",
                          target: "inside",
                          actions: ["applyTunnelRestrictions"],
                        },
                      ],
                    },
                  },
                  inside: {
                    entry: ["applyTunnelRestrictions"],
                    exit: ["removeTunnelRestrictions"],
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: not("inTunnel"),
                          target: "outside",
                          actions: ["removeTunnelRestrictions"],
                        },
                      ],
                    },
                  },
                },
              },
              redZone: {
                initial: "init",
                states: {
                  init: {
                    always: [
                      {
                        cond: "inTunnel",
                        target: "inside",
                        actions: ["applyRedZoneRestrictions"],
                      },
                      {
                        target: "outside",
                        actions: [],
                      },
                    ],
                  },
                  outside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: "inRedZone",
                          target: "inside",
                          actions: ["applyRedZoneRestrictions"],
                        },
                      ],
                    },
                  },
                  inside: {
                    on: {
                      MOVEMENT_FINISHED: [
                        {
                          cond: not("inRedZone"),
                          target: "outside",
                          actions: ["removeRedZoneRestrictions"],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          chaseStatus: {
            initial: "init",
            id: "chaseStatus",
            on: {},
            states: {
              init: {
                tags: ["normal"],
                on: {
                  INSIDE_GHOST_HOUSE: {
                    target: "atHome",
                  },
                  OUTSIDE_GHOST_HOUSE: {
                    target: "leavingHome",
                  },
                },
              },
              atHome: {
                initial: "exitLeft",
                tags: ["normal"],
                entry: ["setHomeTargetTile"],
                states: {
                  exitLeft: {
                    on: {
                      SCATTER: {
                        target: "exitRight",
                      },
                      CHASE: {
                        target: "exitRight",
                      },
                      LEAVE_HOME: {
                        target: "aboutToLeave",
                        actions: ["setTargetTileExitLeft"],
                      },
                    },
                  },
                  exitRight: {
                    on: {
                      LEAVE_HOME: {
                        target: "aboutToLeave",
                        actions: ["setTargetTileExitRight"],
                      },
                    },
                  },
                  aboutToLeave: {
                    type: "final",
                  },
                },
                onDone: {
                  target: "leavingHome",
                },
              },
              leavingHome: {
                tags: ["normal"],
                on: {
                  ON_TARGET_TILE: {
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
                        { to: "movement" }
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
                        { to: "movement" }
                      ),
                    ],

                    on: {
                      CHASE: {
                        target: "chase",
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
                    { to: "movement" }
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
      respondWithUpdatedPosition: respond((ctx) => {
        return {
          type: "UPDATE_POSITION",
          position: ctx.position,
          direction: ctx.direction,
          character: ctx.character,
          nextDirection: ctx.nextDirection,
        };
      }),
      applyRedZoneRestrictions: send(
        {
          type: "ADD_RESTRICTED_DIRECTIONS",
          directions: ["left"],
        },
        { to: "movement" }
      ),
      removeRedZoneRestrictions: send(
        {
          type: "REMOVE_RESTRICTED_DIRECTIONS",
          directions: ["left"],
        },
        { to: "movement" }
      ),
      applyTunnelRestrictions: send(
        { type: "SPECIAL_SPEED", specialKey: "tunnel", specialMultiplier: 0.5 },
        { to: "movement" }
      ),
      removeTunnelRestrictions: send(
        { type: "REMOVE_SPECIAL_SPEED", specialKey: "tunnel" },
        { to: "movement" }
      ),
      sendMovementFinished: send("MOVEMENT_FINISHED"),
      setPosition: assign({
        position: (ctx, event) => event.position,
      }),
      updateGameState: assign({
        gameState: (ctx, event) => event.gameState,
      }),
      setTargetTileScatterMode: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: { row: 15, col: 15 },
        }),
        { to: "movement" }
      ),
      updateTargetTileNormalMode: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.targetTile,
        }),
        { to: "movement" }
      ),
      setTargetTileExitLeft: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.leftExitTile,
        }),
        { to: "movement" }
      ),
      setTargetTileExitRight: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.rightExitTile,
        }),
        { to: "movement" }
      ),
      setHomeTargetTile: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.homeTile,
        }),
        { to: "movement" }
      ),
      sendOnTargetTile: send({ type: "ON_TARGET_TILE" }),
      sendInsideGhostHouse: send({ type: "INSIDE_GHOST_HOUSE" }),
      sendOutsideGhostHouse: send({ type: "OUTSIDE_GHOST_HOUSE" }),

      // setTargetTileScatterMode: assign({
      //   targetTile: (ctx) => ctx.ghostConfig.scatterTargetTile,
      // }),
      // updateTargetTileNormalMode: assign({
      //   targetTile: (ctx) => ctx.ghostConfig.targetTile,
      // }),
      // setHomeTargetTile: assign({
      //   targetTile: (ctx) => ctx.ghostConfig.homeTile,
      // }),
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
      onTargetTile: (ctx, event) => {
        const { targetTile } = event;
        if (!targetTile) {
          return false;
        }
        return (
          targetTile.row === ctx.position.row &&
          targetTile.col === ctx.position.col
        );
      },
      reachedHomeTile: (ctx) => {
        const { homeTile } = ctx.ghostConfig;
        return (
          homeTile.row === ctx.position.row && homeTile.col === ctx.position.col
        );
      },
      inRedZone: (ctx) => {
        const { position, maze } = ctx;
        return maze.zones.red.some((redZone) => {
          return (
            redZone.start.row <= position.row &&
            position.row <= redZone.end.row &&
            redZone.start.col <= position.col &&
            position.col <= redZone.end.col
          );
        });
      },
      inTunnel: (ctx) => {
        const { position, maze } = ctx;
        return maze.zones.tunnels.some((tunnel) => {
          return (
            tunnel.start.row <= position.row &&
            position.row <= tunnel.end.row &&
            tunnel.start.col <= position.col &&
            position.col <= tunnel.end.col
          );
        });
      },
      inGhostHouse: (ctx) => {
        const { position, maze } = ctx;
        const { ghostHouse } = maze.zones;
        return (
          ghostHouse.start.row <= position.row &&
          position.row <= ghostHouse.end.row &&
          ghostHouse.start.col <= position.col &&
          position.col <= ghostHouse.end.col
        );
      },
    },
  }
);

export default GhostMachine;
