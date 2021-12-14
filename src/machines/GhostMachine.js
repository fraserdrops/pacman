import { actions, assign, createMachine, send, sendParent } from "xstate";
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

const createZones = () => {};

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
      direction: "left",
      nextDirection: "left",
      speed: {},
      gameState: {},
      subscription: {},
      restrictions: {
        speed: {},
        directions: {},
      },
      queuedGameMode: "scatter",
      chaseModeHasChanged: false,
      maze: [],
      gameConfig: {
        baseSpeed: 80,
        speedPercentage: {
          tunnel: 0.4,
          normal: 0.75,
          frightened: 0.5,
          returning: 2,
          ghostHouse: 0.5,
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
                  FRIGHTENED: {
                    target: "frightStarted",
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
          PAUSE: {
            actions: ["pauseMovement", () => console.log("PAUSE GHOST")],
          },
          RESUME: {
            actions: ["resumeMovement"],
          },
          UPDATE_NORMAL_SPEED: {
            actions: ["updateNormalSpeedConfig"],
          },
          UPDATE_SCATTER_TARGETING: {
            actions: ["updateScatterTargetingModule"],
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
              UPDATE_POSITION: {
                actions: ["setPosition", "setDirection"],
              },
              RESET_POSITION: {
                target: "stopped",
                actions: ["resetPosition"],
              },
            },
            invoke: {
              src: GhostMovementMachine,
              id: "movement",
              data: {
                position: (ctx, event) => ctx.position,
                nextDirection: (ctx, event) => ctx.nextDirection,
                // targetTile: (ctx, event) => ctx.ghostConfig.targetTile,
                maze: (ctx, event) => ctx.maze,
                direction: (ctx, event) => ctx.direction,
                initialSpeed: (ctx) =>
                  1000 /
                  (ctx.gameConfig.baseSpeed *
                    ctx.gameConfig.speedPercentage.ghostHouse),
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
                        on: {
                          MOVEMENT_FINISHED: [
                            {
                              cond: not("onTargetTile"),
                              target: "outside",
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
              chaseStatus: {
                initial: "init",
                id: "chaseStatus",
                on: {
                  MOVEMENT_FINISHED: {
                    actions: ["setPosition", "setDirection"],
                  },
                  SCATTER: {
                    actions: ["queueScatterMode", "setChaseModeHasChanged"],
                  },
                  CHASE: {
                    actions: ["queueChaseMode", "setChaseModeHasChanged"],
                  },
                },
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
                        actions: ["seekTargetTile", "blockGhostHouseEntrance"],
                      },
                    },
                    exit: ["resumeMovement"],
                  },
                  atHome: {
                    entry: ["setHomeTargetTile", "blockGhostHouseEntrance"],
                    on: {
                      FRIGHTENED: {
                        actions: ["queueFrightMode"],
                      },
                      LEAVE_HOME: {
                        target: "leavingHome",
                        actions: [
                          "seekTargetTile",
                          "unblockGhostHouseEntrance",
                        ],
                      },
                    },
                  },
                  leavingHome: {
                    initial: "headingForHouseEntrance",
                    on: {
                      FRIGHTENED: {
                        actions: ["queueFrightMode"],
                      },
                    },
                    states: {
                      headingForHouseEntrance: {
                        entry: [
                          choose([
                            {
                              actions: ["setTargetTileHouseRightEntrance"],
                              cond: "chaseModeHasChanged",
                            },
                            {
                              actions: ["setTargetTileHouseLeftEntrance"],
                            },
                          ]),
                        ],
                        on: {
                          ON_TARGET_TILE: {
                            target: "exitingHouse",
                          },
                        },
                      },
                      exitingHouse: {
                        entry: [
                          (ctx) => console.log("EXITING HOUSE", ctx.character),
                          choose([
                            {
                              cond: "chaseModeHasChanged",
                              actions: [
                                "setTargetTileExitRight",
                                (ctx) =>
                                  console.log("exit right", ctx.character),
                              ],
                            },
                            {
                              actions: [
                                // selected when "cond1" is false and "cond2" is true
                                "setTargetTileExitLeft",
                                (ctx) =>
                                  console.log("exit left", ctx.character),
                              ],
                            },
                          ]),
                        ],
                        on: {
                          ON_TARGET_TILE: {
                            target: "exitComplete",
                            actions: [
                              "blockGhostHouseEntrance",
                              (ctx) =>
                                console.log(
                                  "GHOST ENTRANCE BLOCKED",
                                  ctx.character
                                ),
                            ],
                          },
                        },
                      },
                      exitComplete: {
                        type: "final",
                      },
                    },
                    onDone: {
                      target: "normal",
                      actions: [
                        (ctx) => console.log("EXIT COMPLETE", ctx.character),
                      ],
                    },
                  },
                  normal: {
                    entry: [(ctx) => console.log("NORMAL MODE", ctx.character)],
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
                            cond: "chaseModeQueued",
                          },
                          {
                            target: "scatter",
                            cond: "scatterModeQueued",
                          },
                          {
                            target: "frightened",
                            cond: "frightModeQueued",
                          },
                        ],
                      },
                      chase: {
                        invoke: {
                          id: "targetingModule",
                          src: (ctx) => ctx.ghostConfig.chaseTargeting,
                        },
                        entry: [
                          "setNormalSpeed",
                          "queueChaseMode",
                          "setChaseModeHasChanged",
                        ],
                        on: {
                          SCATTER: {
                            target: "scatter",
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
                              "updateNormalSpeedConfig",
                              "setNormalSpeed",
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
                          src: (ctx) => {
                            return ctx.ghostConfig.scatterTargeting;
                          },
                        },
                        entry: [
                          "calculateTargetTile",
                          "setNormalSpeed",
                          "queueScatterMode",
                          "setChaseModeHasChanged",
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
                              "updateNormalSpeedConfig",
                              "setNormalSpeed",
                            ],
                          },

                          NEW_TARGET_TILE: {
                            actions: ["forwardNewTargetTile"],
                          },
                        },
                        initial: "targetingActive",
                        states: {
                          targetingActive: {
                            on: {
                              UPDATE_SCATTER_TARGETING: {
                                actions: ["updateScatterTargetingModule"],
                                internal: false,
                              },
                            },
                          },
                        },
                      },
                      frightened: {
                        entry: [
                          "setFrightenedSpeed",
                          "activateRandomMovement",
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
                          "resumeMovement",
                          "unblockGhostHouseEntrance",
                          "setReturningHomeSpeed",
                          "overrideSpeedMultipliers",
                          "ignoreDirectionRestrictions",
                        ],
                      },
                    },
                  },
                  returningHome: {
                    on: {
                      ON_TARGET_TILE: [
                        {
                          target: "leavingHome",
                          actions: [
                            "applyDrectionRestrictions",
                            "notifyGameReturnedHome",
                            "setGhostHouseSpeed",
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
      queueScatterMode: assign({
        queuedGameMode: "scatter",
      }),
      queueChaseMode: assign({
        queuedGameMode: "chase",
      }),
      queueFrightMode: assign({
        queuedGameMode: "frightened",
      }),
      setChaseModeHasChanged: assign({ chaseModeHasChanged: true }),
      setNormalSpeed: send(
        (ctx) => ({
          type: "CHANGE_SPEED",
          intervalMS:
            1000 /
            (ctx.gameConfig.baseSpeed * ctx.gameConfig.speedPercentage.normal),
        }),
        { to: "movement" }
      ),
      setFrightenedSpeed: send(
        (ctx) => ({
          type: "CHANGE_SPEED",
          intervalMS:
            1000 /
            (ctx.gameConfig.baseSpeed *
              ctx.gameConfig.speedPercentage.frightened),
        }),
        { to: "movement" }
      ),
      setReturningHomeSpeed: send(
        (ctx) => ({
          type: "CHANGE_SPEED",
          intervalMS:
            1000 /
            (ctx.gameConfig.baseSpeed *
              ctx.gameConfig.speedPercentage.returning),
        }),
        { to: "movement" }
      ),
      setGhostHouseSpeed: send(
        (ctx) => ({
          type: "CHANGE_SPEED",
          intervalMS:
            1000 /
            (ctx.gameConfig.baseSpeed *
              ctx.gameConfig.speedPercentage.ghostHouse),
        }),
        { to: "movement" }
      ),
      activateRandomMovement: send(
        (ctx) => ({
          type: "RANDOM_MOVEMENT",
          intervalMS:
            ctx.gameConfig.baseSpeed /
            ctx.gameConfig.speedPercentage.frightened,
        }),
        { to: "movement" }
      ),
      applyDrectionRestrictions: send(
        (ctx) => ({
          type: "APPLY_DIRECTION_RESTRICTIONS",
        }),
        { to: "movement" }
      ),
      overrideSpeedMultipliers: send(
        (ctx) => ({
          type: "OVERRIDE_SPEED_MULTIPLIERS",
        }),
        { to: "movement" }
      ),
      ignoreDirectionRestrictions: send(
        (ctx) => ({
          type: "IGNORE_DIRECTION_RESTRICTIONS",
        }),
        { to: "movement" }
      ),
      notifyGameReturnedHome: sendParent((ctx) => {
        console.log("notify returned");
        return {
          type: "GHOST_HAS_RETURNED_HOME",
          ghost: ctx.character,
        };
      }),
      updateNormalSpeedConfig: assign({
        gameConfig: (ctx, event) => ({
          ...ctx.gameConfig,
          speedPercentage: {
            ...ctx.gameConfig.speedPercentage,
            normal: event.speedPercentage,
          },
        }),
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
      pauseMovement: send("PAUSE", { to: "movement" }),
      resumeMovement: send("RESUME", { to: "movement" }),
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
      updateScatterTargetingModule: assign({
        ghostConfig: (ctx, event) => ({
          ...ctx.ghostConfig,
          scatterTargeting: event.targetingModule,
        }),
      }),
      applyTunnelRestrictions: send(
        { type: "SPECIAL_SPEED", specialKey: "tunnel", specialMultiplier: 0.5 },
        { to: "movement" }
      ),
      removeTunnelRestrictions: send(
        { type: "REMOVE_SPECIAL_SPEED", specialKey: "tunnel" },
        { to: "movement" }
      ),
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
      setTargetTileExitLeft: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.gameConfig.leftExitTile,
          character: ctx.character,
        }),
        { to: "movement" }
      ),
      setTargetTileExitRight: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.gameConfig.rightExitTile,
          character: ctx.character,
        }),
        { to: "movement" }
      ),
      setTargetTileHouseLeftEntrance: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.gameConfig.leftEntranceTile,
          character: ctx.character,
        }),
        { to: "movement" }
      ),
      setTargetTileHouseRightEntrance: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.gameConfig.rightEntranceTile,
          character: ctx.character,
        }),
        { to: "movement" }
      ),
      setHomeReturnTargetTile: send(
        (ctx) => ({
          type: "CHANGE_TARGET_TILE",
          targetTile: ctx.ghostConfig.homeReturnTile,
          character: ctx.character,
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
      resetPosition: assign({
        position: (ctx) => ctx.ghostConfig.startPosition,
        direction: (ctx) => ctx.ghostConfig.startDirection,
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
          return !this[guard](ctx, event);
        };
      },
      frightModeQueued: (ctx) => ctx.queuedGameMode === "frightened",
      scatterModeQueued: (ctx) => ctx.queuedGameMode === "scatter",
      chaseModeQueued: (ctx) => ctx.queuedGameMode === "chase",
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
