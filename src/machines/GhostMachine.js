import { actions, assign, createMachine, send } from "xstate";
import { isPositionWithinZone } from "../util/characterUtil";
import GhostMovementMachine from "./GhostMovementMachine";
const { raise, respond, choose, pure } = actions;

const every = (...guards) => ({
  type: "every",
  guards,
});

const not = (guard) => ({
  type: "not",
  guard,
});

const GhostMachine = createMachine(
  {
    id: "ghostMachine",
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
      scatterTargeting: undefined,
      chaseTargeting: undefined,
      direction: "left",
      scatterModeTile: {},
      nextDirection: "left",
      speed: {},
      gameState: {},
      subscription: {},
      restrictions: {
        speed: {},
        directions: {},
      },
      chaseModeHasChanged: false,
      maze: [],
      gameConfig: {
        baseSpeed: 35,
        speedPercentage: {
          tunnel: 0.4,
          normal: 0.75,
          frightened: 0.5,
          returning: 4,
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

    type: "parallel",
    states: {
      view: {
        type: "parallel",
        states: {
          appearence: {
            initial: "regular",
            on: {
              DIED: {
                target: ".dead",
              },
              HIDE_DISPLAY: {
                target: ".hidden",
              },
              RESET_POSITION: {
                target: ".regular",
              },
            },
            states: {
              regular: {
                tags: ["regular"],
                on: {
                  FRIGHTENED: {
                    target: "frightStarted",
                  },
                },
              },
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
                on: {
                  SCATTER: {
                    target: "regular",
                  },
                  CHASE: {
                    target: "regular",
                  },
                },
              },
              dead: {
                tags: ["dead"],
                on: {
                  RESUME: {
                    target: "eyes",
                  },
                },
              },
              eyes: {
                tags: ["returningHome"],
                on: {
                  ON_TARGET_TILE: {
                    target: "regular",
                  },
                },
              },
              hidden: {
                tags: ["hidden"],
              },
            },
          },
          movement: {
            initial: "moving",
            states: {
              moving: {},
              paused: {},
            },
          },
        },
      },
      core: {
        initial: "stopped",
        on: {
          GAME_SYNC: {
            actions: ["respondWithUpdatedPosition", "updateGameState"],
          },
          RESET_POSITION: {
            target: ".playing",
            actions: ["setPosition"],
          },
          PAUSE: {
            actions: [
              send("PAUSE", { to: "movement" }),
              () => console.log("PAUSE PUASE"),
            ],
          },
          RESUME: {
            actions: [send("RESUME", { to: "movement" })],
          },
          UPDATE_NORMAL_SPEED: {
            actions: [
              assign({
                gameConfig: (ctx, event) => ({
                  ...ctx.gameConfig,
                  speedPercentage: {
                    ...ctx.gameConfig.speedPercentage,
                    normal: event.speedPercentage,
                  },
                }),
              }),
            ],
          },
          UPDATE_SCATTER_TARGETING: {
            actions: [
              assign({
                scatterTargeting: (ctx, event) => event.targetingModule,
              }),
            ],
            internal: false,
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
            on: {
              START: {
                target: "playing",
              },
            },
          },
          playing: {
            type: "parallel",
            on: {
              UPDATE_POSITION: { actions: ["setPosition", "setDirection"] },
              RESET_POSITION: {
                target: "stopped",
                actions: ["setPosition", "setDirection"],
              },
            },
            invoke: {
              src: GhostMovementMachine,
              id: "movement",
              data: {
                position: (ctx, event) => ctx.position,
                nextDirection: (ctx, event) => ctx.nextDirection,
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
                        // entry: [
                        //   "sendOnTargetTile",
                        //   () => console.log("SEND ON"),
                        // ],
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
              gameChaseMode: {
                id: "gameChaseMode",
                initial: "chase",
                on: {
                  SCATTER: {
                    target: ".scatter",
                    actions: ["chaseModeHasChanged"],
                  },
                  CHASE: {
                    target: ".chase",
                    actions: ["chaseModeHasChanged"],
                  },
                  FRIGHTENED: {
                    target: ".frightened",
                  },
                  MOVEMENT_FINISHED: {
                    actions: ["setPosition", "setDirection"],
                  },
                },
                states: {
                  chase: {
                    entry: [() => console.log("CHASE BABY")],
                  },
                  scatter: {
                    entry: [() => console.log("SCATTER BABY")],
                  },
                  frightened: {
                    entry: [() => console.log("FRIGHT BABY")],
                  },
                },
              },
              chaseStatus: {
                initial: "init",
                id: "chaseStatus",
                states: {
                  init: {
                    entry: ["applyRedZoneRestrictions"],
                    on: {
                      INSIDE_GHOST_HOUSE: {
                        target: "atHome",
                        actions: ["switchToStrobeMovement"],
                      },
                      OUTSIDE_GHOST_HOUSE: {
                        target: "normal",
                        actions: [
                          // "setTargetTileExitLeft",
                          "seekTargetTile",
                          () => console.log("LEFT EXIT"),
                        ],
                      },
                    },
                    exit: [send("RESUME", { to: "movement" })],
                  },
                  atHome: {
                    entry: [
                      "setHomeTargetTile",
                      // "applyAtHomeMovementRestrictions",
                      "blockGhostHouseEntrance",
                    ],
                    on: {
                      LEAVE_HOME: {
                        target: "leavingHome",
                        actions: [
                          "setTargetTileHouseEntrance",
                          "seekTargetTile",
                          "unblockGhostHouseEntrance",
                        ],
                      },
                    },
                    // exit: ["removeAtHomeMovementRestrictions"],
                  },
                  leavingHome: {
                    initial: "headingForHouseEntrance",
                    states: {
                      headingForHouseEntrance: {
                        entry: [
                          choose(
                            [
                              {
                                actions: ["setTargetTileHouseRightEntrance"],
                                cond: "chaseModeHasChanged",
                              },
                            ],
                            {
                              actions: ["setTargetTileHouseLeftEntrance"],
                            }
                          ),
                        ],
                        on: {
                          ON_TARGET_TILE: {
                            target: "exitingHouse",
                          },
                        },
                      },
                      exitingHouse: {
                        entry: [
                          () => console.log("EXITING HOUSE"),
                          choose(
                            [
                              {
                                actions: ["setTargetTileExitRight"],
                                cond: "chaseModeHasChanged",
                              },
                            ],
                            {
                              actions: ["setTargetTileExitLeft"],
                            }
                          ),
                        ],
                        on: {
                          ON_TARGET_TILE: {
                            target: "exitComplete",
                            actions: ["blockGhostHouseEntrance"],
                          },
                        },
                      },
                      exitComplete: {
                        entry: [() => console.log("EXITING COMOPLETE")],
                        type: "final",
                      },
                    },
                    onDone: {
                      target: "normal",
                    },
                  },
                  normal: {
                    invoke: {
                      id: "targetingModule",
                      src: (ctx) => ctx.scatterTargeting,
                    },
                    on: {
                      DIED: {
                        target: "dead",
                      },
                    },
                    initial: "checkingGameModeState",
                    states: {
                      checkingGameModeState: {
                        always: [
                          {
                            target: "chase",
                            in: "#ghostMachine.core.playing.gameChaseMode.chase",
                          },
                          {
                            target: "scatter",
                            in: "#ghostMachine.core.playing.gameChaseMode.scatter",
                          },
                          {
                            target: "frightened",
                            in: "#ghostMachine.core.playing.gameChaseMode.frightened",
                          },
                        ],
                      },
                      chase: {
                        invoke: {
                          id: "targetingModule",
                          src: (ctx) => ctx.ghostConfig.chaseTargeting,
                        },
                        entry: [
                          send(
                            (ctx) => ({
                              type: "CHANGE_SPEED",
                              intervalMS:
                                ctx.gameConfig.baseSpeed /
                                ctx.gameConfig.speedPercentage.normal,
                            }),
                            { to: "movement" }
                          ),
                          // "calculateTargetTile",
                        ],
                        on: {
                          SCATTER: {
                            target: "scatter",
                            actions: ["startReversingSequence"],
                          },
                          FRIGHTENED: {
                            target: "frightened",
                          },
                          TICK: {
                            actions: ["updateTargetTileNormalMode"],
                          },
                          GAME_SYNC: {
                            actions: [
                              "respondWithUpdatedPosition",
                              "updateGameState",
                              "calculateTargetTile",
                            ],
                          },
                          UPDATE_NORMAL_SPEED: {
                            actions: [
                              assign({
                                gameConfig: (ctx, event) => ({
                                  ...ctx.gameConfig,
                                  speedPercentage: {
                                    ...ctx.gameConfig.speedPercentage,
                                    normal: event.speedPercentage,
                                  },
                                }),
                              }),
                              send(
                                (ctx) => ({
                                  type: "CHANGE_SPEED",
                                  intervalMS:
                                    ctx.gameConfig.baseSpeed /
                                    ctx.gameConfig.speedPercentage.normal,
                                }),
                                { to: "movement" }
                              ),
                            ],
                          },
                          NEW_TARGET_TILE: {
                            actions: ["forwardNewTargetTile"],
                          },
                        },
                      },
                      scatter: {
                        invoke: {
                          id: "targetingModule",
                          src: (ctx) => ctx.ghostConfig.scatterTargeting,
                        },
                        entry: [
                          "setTargetTileScatterMode",
                          send(
                            (ctx) => ({
                              type: "CHANGE_SPEED",
                              intervalMS:
                                ctx.gameConfig.baseSpeed /
                                ctx.gameConfig.speedPercentage.normal,
                            }),
                            { to: "movement" }
                          ),
                        ],
                        on: {
                          CHASE: {
                            target: "chase",
                            actions: ["startReversingSequence"],
                          },
                          FRIGHTENED: {
                            target: "frightened",
                          },
                          GAME_SYNC: {
                            actions: [
                              "respondWithUpdatedPosition",
                              "updateGameState",
                              "calculateTargetTile",
                            ],
                          },
                          UPDATE_NORMAL_SPEED: {
                            actions: [
                              assign({
                                gameConfig: (ctx, event) => ({
                                  ...ctx.gameConfig,
                                  speedPercentage: {
                                    ...ctx.gameConfig.speedPercentage,
                                    normal: event.speedPercentage,
                                  },
                                }),
                              }),
                              send(
                                (ctx) => ({
                                  type: "CHANGE_SPEED",
                                  intervalMS:
                                    ctx.gameConfig.baseSpeed /
                                    ctx.gameConfig.speedPercentage.normal,
                                }),
                                { to: "movement" }
                              ),
                            ],
                          },
                          UPDATE_SCATTER_TARGETING: {
                            actions: [
                              assign({
                                scatterTargeting: (ctx, event) =>
                                  event.targetingModule,
                              }),
                            ],
                            internal: false,
                          },
                          NEW_TARGET_TILE: {
                            actions: ["forwardNewTargetTile"],
                          },
                        },
                      },
                      frightened: {
                        entry: [
                          send(
                            (ctx) => ({
                              type: "CHANGE_SPEED",
                              intervalMS:
                                ctx.gameConfig.baseSpeed /
                                ctx.gameConfig.speedPercentage.frightened,
                            }),
                            { to: "movement" }
                          ),
                          send(
                            (ctx) => ({
                              type: "RANDOM_MOVEMENT",
                              intervalMS:
                                ctx.gameConfig.baseSpeed /
                                ctx.gameConfig.speedPercentage.frightened,
                            }),
                            { to: "movement" }
                          ),
                          "startReversingSequence",
                        ],
                        on: {
                          SCATTER: {
                            target: "scatter",
                            actions: ["seekTargetTile"],
                          },
                          CHASE: {
                            target: "chase",
                            actions: ["seekTargetTile"],
                          },
                          FRIGHTENED: {
                            target: "frightened",
                            internal: false,
                          },
                        },
                      },
                    },
                  },
                  dead: {
                    on: {
                      RESUME: {
                        target: "returningHome",
                        actions: [
                          "setHomeReturnTargetTile",
                          "seekTargetTile",
                          send("RESUME", { to: "movement" }),
                          "unblockGhostHouseEntrance",
                          send(
                            (ctx) => ({
                              type: "CHANGE_SPEED",
                              intervalMS:
                                ctx.gameConfig.baseSpeed /
                                ctx.gameConfig.speedPercentage.returning,
                            }),
                            { to: "movement" }
                          ),
                          send(
                            (ctx) => ({
                              type: "OVERRIDE_SPEED_MULTIPLIERS",
                            }),
                            { to: "movement" }
                          ),
                          send(
                            (ctx) => ({
                              type: "IGNORE_DIRECTION_RESTRICTIONS",
                            }),
                            { to: "movement" }
                          ),
                        ],
                      },
                    },
                  },
                  returningHome: {
                    on: {
                      ON_TARGET_TILE: [
                        {
                          // cond: "reachedHomeTile",
                          target: "leavingHome",
                          actions: [
                            send(
                              (ctx) => ({
                                type: "APPLY_DIRECTION_RESTRICTIONS",
                              }),
                              { to: "movement" }
                            ),
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          paused: {},
          dying: {},
        },
      },
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
      chaseModeHasChanged: assign({ chaseModeHasChanged: () => true }),
      switchToStrobeMovement: send("", { to: "movement" }),
      seekTargetTile: send("SEEK_TARGET_TILE", { to: "movement" }),
      applyRedZoneRestrictions: pure((ctx) => {
        return ctx.maze.zones.redZones.map((zone, index) => {
          return send(
            (ctx, event) => ({
              type: "ADD_RESTRICTED_DIRECTIONS",
              zone,
              zoneKey: "red" + index,
              restrictedDirections: ["up"],
            }),
            { to: "movement" }
          );
        });
      }),
      startReversingSequence: send("START_REVERSING_SEQUENCE", {
        to: "movement",
      }),
      removeRedZoneRestrictions: pure((ctx) => {
        return ctx.maze.zones.redZones.map((zone, index) => {
          return send(
            (ctx, event) => ({
              type: "REMOVE_RESTRICTED_DIRECTIONS",
              zoneKey: "red" + index,
            }),
            { to: "movement" }
          );
        });
      }),
      applyAtHomeMovementRestrictions: send(
        (ctx, event) => ({
          type: "ADD_RESTRICTED_DIRECTIONS",
          zone: ctx.maze.zones.ghostHouse,
          zoneKey: "ghostHouse",
          restrictedDirections: ["left", "right"],
        }),
        { to: "movement" }
      ),
      removeAtHomeMovementRestrictions: send(
        {
          type: "REMOVE_RESTRICTED_DIRECTIONS",
          directions: ["left", "right"],
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
      setDirection: assign({
        direction: (ctx, event) => event.direction,
      }),
      updateGameState: assign({
        gameState: (ctx, event) => event.gameState,
      }),
      forwardNewTargetTile: send(
        (ctx, event) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: event.targetTile,
        }),
        { to: "movement" }
      ),
      setTargetTileScatterMode: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.scatterTargetTile,
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
      setTargetTileHouseLeftEntrance: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.leftEntranceTile,
        }),
        { to: "movement" }
      ),
      setTargetTileHouseRightEntrance: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.rightEntranceTile,
        }),
        { to: "movement" }
      ),
      setHomeReturnTargetTile: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.homeReturnTile,
        }),
        { to: "movement" }
      ),
      sendOnTargetTile: send({ type: "ON_TARGET_TILE" }),
      sendInsideGhostHouse: send({ type: "INSIDE_GHOST_HOUSE" }),
      sendOutsideGhostHouse: send({ type: "OUTSIDE_GHOST_HOUSE" }),
      calculateTargetTile: send(
        (ctx, event) => ({
          type: "CALCULATE_TARGET_TILE",
          gameState: ctx.gameState,
        }),
        { to: "targetingModule" }
      ),
      blockGhostHouseEntrance: send(
        (ctx, event) => ({
          type: "ADD_FORBIDDEN_ZONE",
          zone: ctx.maze.zones.ghostHouseEntrance,
          zoneKey: "ghostHouseEntrance",
        }),
        { to: "movement" }
      ),
      unblockGhostHouseEntrance: send(
        (ctx, event) => ({
          type: "REMOVE_FORBIDDEN_ZONE",
          zoneKey: "ghostHouseEntrance",
        }),
        { to: "movement" }
      ),

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
        return maze.zones.redZones.some((redZone) => {
          return isPositionWithinZone(position, redZone);
        });
      },
      inTunnel: (ctx) => {
        const { position, maze } = ctx;
        return maze.zones.tunnels.some((tunnel) => {
          return isPositionWithinZone(position, tunnel);
        });
      },
      inGhostHouse: (ctx) => {
        const { position, maze } = ctx;
        const { ghostHouse } = maze.zones;
        return isPositionWithinZone(position, ghostHouse);
      },
      chaseModeHasChanged: (ctx) => ctx.chaseModeHasChanged,
    },
  }
);

export default GhostMachine;
