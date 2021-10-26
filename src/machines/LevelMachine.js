import {
  createMachine,
  spawn,
  assign,
  send,
  actions,
  forwardTo,
  sendParent,
} from "xstate";
import PacmanMachine from "./PacmanMachine";
import GhostMachine from "./GhostMachine";
import { createMaze, getTileType, setTileType } from "../shared/maze";
import IntervalMachine from "./IntervalMachine";
import Fruit from "./FruitMachine";
import {
  BlinkyChaseTargeting,
  BlinkyElroyScatterTargeting,
  BlinkyScatterTargeting,
} from "./BlinkyTargeting";
import {
  PinkyChaseTargeting,
  PinkyScatterTargeting,
} from "./PinkyScatterTargetingMachine";

const { pure, choose, raise } = actions;
const GHOST_HOUSE_MIDDLE_ROW = 17;
const GHOST_HOUSE_BOTTOM_ROW = 18;
const GHOST_HOUSE_LEFT_COL = 12;
const GHOST_HOUSE_MIDDLE_COL = 13;
const GHOST_HOUSE_RIGHT_COL = 14;
const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;
const MIN_COL_OFFSET = 0;
const MAX_COL_OFFSET = 7;
const MIN_ROW_OFFSET = 0;
const MAX_ROW_OFFSET = 7;

const FRUIT_DROP_ROW = 20;
const FRUIT_DROP_COL = 13;

const createGameStateForCharacters = (ctx) => {
  const gameState = {
    pacman: {
      direction: ctx.pacman.direction,
      position: ctx.pacman.position,
    },
    pelletsRemaining: ctx.pelletsRemaining,
  };

  Object.keys(ctx.ghosts).forEach((ghostName) => {
    gameState[ghostName] = {
      direction: ctx.ghosts[ghostName].direction,
      position: ctx.ghosts[ghostName].position,
    };
  });
  return gameState;
};

const characterStartPositions = {
  pacman: {
    row: 26,
    col: 13,
    rowOffset: 4,
    colOffset: 7,
  },
  inky: {
    row: GHOST_HOUSE_MIDDLE_ROW,
    col: GHOST_HOUSE_LEFT_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  pinky: {
    row: GHOST_HOUSE_MIDDLE_ROW,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: MAX_COL_OFFSET,
  },
  clyde: {
    row: GHOST_HOUSE_MIDDLE_ROW,
    col: GHOST_HOUSE_RIGHT_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  blinky: {
    row: GHOST_HOUSE_MIDDLE_ROW - 3,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
};

const ghostHomeReturnTiles = {
  inky: {
    row: GHOST_HOUSE_BOTTOM_ROW,
    col: GHOST_HOUSE_LEFT_COL,
  },
  pinky: {
    row: GHOST_HOUSE_BOTTOM_ROW,
    col: GHOST_HOUSE_MIDDLE_COL,
  },
  blinky: {
    row: GHOST_HOUSE_BOTTOM_ROW,
    col: GHOST_HOUSE_MIDDLE_COL,
  },
  clyde: {
    row: GHOST_HOUSE_BOTTOM_ROW,
    col: GHOST_HOUSE_RIGHT_COL,
  },
};

const leftExitTile = { row: 14, col: 12 };
const rightExitTile = { row: 14, col: 16 };

const leftEntranceTile = {
  col: GHOST_HOUSE_MIDDLE_COL,
  row: GHOST_HOUSE_MIDDLE_ROW - 2,
};
const rightEntranceTile = {
  col: GHOST_HOUSE_MIDDLE_COL + 1,
  row: GHOST_HOUSE_MIDDLE_ROW - 2,
};

const characterStartDirections = {
  pacman: "left",
  inky: "up",
  pinky: "down",
  clyde: "up",
  blinky: "left",
};

const getPoints = (event) => {
  const pointsMap = {
    pellet: 10,
    powerPellet: 50,
    fruit: 100,
    ghost1: 200,
    ghost2: 400,
    ghost3: 800,
    ghost4: 1600,
  };
  return pointsMap[event];
};

const createGameConfigForGhost = (ghostLevelConfig) => {
  return {
    baseSpeed: 80,
    speedPercentage: {
      tunnel: ghostLevelConfig.tunnelSpeedPercentage,
      normal: ghostLevelConfig.normalSpeedPercentage,
      frightened: ghostLevelConfig.frightenedSpeedPercentage,
      returning: 2,
      ghostHouse: 0.5,
    },
    leftExitTile,
    rightExitTile,
    leftEntranceTile,
    rightEntranceTile,
  };
};

const LevelMachine = createMachine(
  {
    id: "levelMachine",
    context: {
      pacman: {
        ref: undefined,
      },
      ghosts: {},
      deadGhosts: [],
      revivedGhosts: [],
      maze: createMaze(),
      waitingForResponse: [],

      pelletCounters: {
        personal: {
          pinky: 0,
          inky: 0,
          clyde: 0,
        },
        global: 0,
      },
      totalPoints: 0,
      ghostsEaten: 0,
      pelletsEaten: 0,

      // these properties are overriden by the game machine
      livesRemaining: undefined,
      levelConfig: undefined,
    },
    initial: "initial",
    states: {
      initial: {
        entry: [
          (ctx, event, meta) =>
            console.log(
              "META",
              createGameConfigForGhost(ctx.levelConfig.ghosts)
            ),
          assign({
            pacman: (ctx) => ({
              ref: spawn(
                PacmanMachine.withContext({
                  ...PacmanMachine.context,
                  maze: ctx.maze,
                  position: {
                    row: 26,
                    col: 13,
                    rowOffset: 4,
                    colOffset: 7,
                  },
                  direction: characterStartDirections.pacman,
                  levelConfig: {
                    speedPercentage: {
                      normal: ctx.levelConfig.pacman.normalSpeedPercentage,
                      frightened:
                        ctx.levelConfig.pacman.frightenedSpeedPercentage,
                    },
                  },
                }),
                "pacman"
              ),
            }),
            ghosts: (ctx) => ({
              // inky: {
              //   ref: spawn(
              //     GhostMachine.withContext({
              //       ...GhostMachine.context,
              //       maze: ctx.maze,
              //       character: "inky",
              //       position: characterStartPositions.inky,
              //       direction: characterStartDirections.inky,
              //       ghostConfig: {
              //         scatterTargeting: BlinkyScatterTargeting,
              //         chaseTargeting: BlinkyChaseTargeting,
              //         homeTile: characterStartPositions.inky,
              //         targetTile: { row: 1, col: 1 },
              //         leftExitTile: {
              //           row: GHOST_HOUSE_MIDDLE_ROW - 3,
              //           col: GHOST_HOUSE_MIDDLE_COL - 1,
              //         },
              //         rightExitTile: {
              //           row: GHOST_HOUSE_MIDDLE_ROW - 3,
              //           col: GHOST_HOUSE_MIDDLE_COL + 1,
              //         },
              //       },
              //     }),
              //     "inky"
              //   ),
              // },
              pinky: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "pinky",
                    position: characterStartPositions.pinky,
                    direction: characterStartDirections.pinky,
                    ghostConfig: {
                      scatterTargeting: PinkyScatterTargeting,
                      chaseTargeting: PinkyChaseTargeting,
                      homeReturnTile: ghostHomeReturnTiles.pinky,
                    },
                    gameConfig: createGameConfigForGhost(
                      ctx.levelConfig.ghosts
                    ),
                  }),
                  "pinky"
                ),
              },
              // clyde: {
              //   ref: spawn(
              //     GhostMachine.withContext({
              //       ...GhostMachine.context,
              //       maze: ctx.maze,
              //       character: "clyde",
              //       position: characterStartPositions.clyde,
              //       direction: characterStartDirections.clyde,
              //       ghostConfig: {
              //         scatterTargeting: BlinkyScatterTargeting,
              //         chaseTargeting: BlinkyChaseTargeting,
              //         homeTile: characterStartPositions.clyde,
              //         targetTile: { row: 1, col: 1 },

              //         leftExitTile: {
              //           row: GHOST_HOUSE_MIDDLE_ROW - 3,
              //           col: GHOST_HOUSE_MIDDLE_COL - 1,
              //         },
              //         rightExitTile: {
              //           row: GHOST_HOUSE_MIDDLE_ROW - 3,
              //           col: GHOST_HOUSE_MIDDLE_COL + 1,
              //         },
              //       },
              //     }),
              //     "clyde"
              //   ),
              // },
              blinky: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "blinky",
                    position: characterStartPositions.blinky,
                    direction: characterStartDirections.blinky,
                    ghostConfig: {
                      scatterTargeting: BlinkyScatterTargeting,
                      chaseTargeting: BlinkyChaseTargeting,
                      homeReturnTile: ghostHomeReturnTiles.blinky,
                    },
                    gameConfig: createGameConfigForGhost(
                      ctx.levelConfig.ghosts
                    ),
                  }),
                  "blinky"
                ),
              },
            }),
          }),
        ],
        always: {
          target: "inGame",
        },
        on: {
          START_GAME: {
            target: "inGame",
          },
        },
      },
      inGame: {
        initial: "getReady",
        type: "compound",
        states: {
          getReady: {
            tags: ["getReady"],
            after: {
              1000: {
                actions: ["notifyGhostsGetReady"],
              },
              4000: {
                target: "playing",
                actions: ["notifyAllStart"],
              },
            },
          },
          playing: {
            type: "parallel",
            on: {
              LEFT_ARROW: {
                actions: [
                  send({ type: "LEFT" }, { to: "pacman" }),
                  () => console.log("LEFT ARROW"),
                ],
              },
              RIGHT_ARROW: {
                actions: [send({ type: "RIGHT" }, { to: "pacman" })],
              },
              UP_ARROW: {
                actions: [send({ type: "UP" }, { to: "pacman" })],
              },
              DOWN_ARROW: {
                actions: [send({ type: "DOWN" }, { to: "pacman" })],
              },
              GAME_OVER: {
                target: "gameOver",
              },
              LEVEL_COMPLETE: {
                target: "levelComplete",
                actions: ["pauseCharacters", "hideGhosts"],
              },
              LOSE_LIFE: {
                target: "lostLife",
              },
              GHOST_HAS_RETURNED_HOME: {
                actions: ["removeGhostFromDeadGhosts", "addRevivedGhost"],
              },
            },
            states: {
              pelletWatcher: {
                on: {
                  PELLET_EATEN: [
                    {
                      cond: "releaseElroy",
                      actions: [
                        send(
                          {
                            type: "UPDATE_NORMAL_SPEED",
                            speedPercentage: 1.95,
                          },
                          { to: "blinky" }
                        ),
                        send(
                          {
                            type: "UPDATE_SCATTER_TARGETING",
                            targetingModule: BlinkyElroyScatterTargeting,
                          },
                          { to: "blinky" }
                        ),
                      ],
                    },
                  ],
                },
              },
              ghostExit: {
                type: "parallel",
                states: {
                  ghosts: {
                    initial: "pinkyActive",
                    states: {
                      pinkyActive: {
                        on: {
                          UPDATE_PERSONAL_COUNTER: [
                            {
                              cond: "pinkyLeavePersonal",
                              target: "inkyActive",
                              actions: [
                                {
                                  type: "incrementPersonalCounter",
                                  ghost: "pinky",
                                },
                                "pinkyLeaveHome",
                              ],
                            },
                            {
                              actions: [
                                {
                                  type: "incrementPersonalCounter",
                                  ghost: "pinky",
                                },
                              ],
                            },
                          ],
                          GLOBAL_COUNTER_INCREMENTED: [
                            {
                              cond: "pinkyLeaveGlobal",
                              target: "inkyActive",
                            },
                            {
                              cond: "shouldResetGlobalCounter",
                              actions: [send("RESET_GLOBAL_COUNTER")],
                            },
                          ],
                          NEXT_GHOST_LEAVE_HOME: {
                            target: "inkyActive",
                            actions: ["pinkyLeaveHome"],
                          },
                        },
                      },
                      inkyActive: {
                        on: {
                          // UPDATE_PERSONAL_COUNTER: [
                          //   {
                          //     cond: "inkyLeavePersonal",
                          //     target: "clydeActive",
                          //     actions: [
                          //       {
                          //         type: "incrementPersonalCounter",
                          //         ghost: "inky",
                          //       },
                          //       "inkyLeaveHome",
                          //     ],
                          //   },
                          //   {
                          //     actions: [
                          //       {
                          //         type: "incrementPersonalCounter",
                          //         ghost: "inky",
                          //       },
                          //     ],
                          //   },
                          // ],
                          GLOBAL_COUNTER_INCREMENTED: [
                            {
                              cond: "inkyLeaveGlobal",
                              // target: "clydeActive",
                            },
                            {
                              cond: "shouldResetGlobalCounter",
                              actions: [send("RESET_GLOBAL_COUNTER")],
                            },
                          ],
                          // NEXT_GHOST_LEAVE_HOME: {
                          //   target: "clydeActive",
                          //   actions: ["inkyLeaveHome"],
                          // },
                        },
                      },
                      clydeActive: {
                        on: {
                          UPDATE_PERSONAL_COUNTER: [
                            {
                              cond: "clydeLeavePersonal",
                              target: "allGhostsExited",
                              actions: [
                                {
                                  type: "incrementPersonalCounter",
                                  ghost: "clyde",
                                },
                                "clydeLeaveHome",
                                "notifyBlinkyClydeHasLeft",
                              ],
                            },
                            {
                              actions: [
                                {
                                  type: "incrementPersonalCounter",
                                  ghost: "clyde",
                                },
                              ],
                            },
                          ],
                          GLOBAL_COUNTER_INCREMENTED: [
                            {
                              cond: "clydeLeaveGlobal",
                              target: "allGhostsExited",
                            },
                            {
                              cond: "shouldResetGlobalCounter",
                              actions: [send("RESET_GLOBAL_COUNTER")],
                            },
                          ],
                          NEXT_GHOST_LEAVE_HOME: {
                            target: "allGhostsExited",
                            actions: [
                              "clydeLeaveHome",
                              "notifyBlinkyClydeHasLeft",
                            ],
                          },
                        },
                      },
                      allGhostsExited: {
                        type: "final",
                      },
                    },
                  },
                  timer: {
                    invoke: {
                      src: (ctx) => (callback) => {
                        const interval = setInterval(() => {
                          callback("NEXT_GHOST_LEAVE_HOME");
                        }, 4000);
                        return () => {
                          clearInterval(interval);
                        };
                      },
                    },
                    on: {
                      PELLET_EATEN: {
                        target: "timer",
                        internal: false,
                      },
                    },
                  },
                  counter: {
                    initial: "init",
                    states: {
                      init: {
                        always: [
                          {
                            target: "personalCounters",
                            cond: "noLivesLost",
                          },
                          { target: "globalCounter" },
                        ],
                      },
                      personalCounters: {
                        initial: "init",
                        states: {
                          init: {
                            always: {
                              actions: [send("UPDATE_PERSONAL_COUNTER")],
                              target: "ready",
                            },
                          },
                          ready: {},
                        },
                        on: {
                          PELLET_EATEN: {
                            actions: [
                              "incrementPersonalCounter",
                              "notifyPersonalCounterIncremented",
                            ],
                          },
                        },
                      },
                      globalCounter: {
                        on: {
                          PELLET_EATEN: {
                            actions: [
                              "incrementPersonalCounter",
                              "notifyPersonalCounterIncremented",
                            ],
                          },
                          RESET_GLOBAL_COUNTER: {
                            target: "personalCounters",
                            actions: ["resetGlobalCounter"],
                          },
                        },
                      },
                    },
                  },
                },
              },
              fruit: {
                initial: "noFruit",
                states: {
                  noFruit: {
                    on: {
                      PELLET_EATEN: [
                        {
                          cond: "shouldDropFirstFruit",
                          target: "fruitActive",
                          actions: ["dropFruit"],
                        },
                        {
                          cond: "shouldDropSecondFruit",
                          target: "fruitActive",
                          actions: ["dropFruit"],
                        },
                      ],
                    },
                  },
                  fruitActive: {
                    initial: "ripe",
                    states: {
                      ripe: {},
                      rotten: {},
                    },
                    invoke: {
                      src: IntervalMachine.withContext({
                        intervals: [
                          {
                            eventType: "REMOVE_FRUIT",
                            seconds: 9 + Math.random(), //
                          },
                        ],
                      }),
                    },
                    on: {
                      FRUIT_EATEN: {
                        target: "fruitInactive",
                        actions: [
                          forwardTo("fruit"),
                          {
                            type: "awardPoints",
                            points: getPoints("fruit"),
                          },
                        ],
                      },
                      REMOVE_FRUIT: {
                        target: "noFruit",
                        actions: ["removeFruit"],
                      },
                    },
                  },
                  fruitInactive: {
                    on: {
                      REMOVE_FRUIT: {
                        target: "noFruit",
                        actions: ["removeFruit"],
                      },
                    },
                  },
                },
              },
              loop: {
                initial: "waiting",
                states: {
                  waiting: {
                    on: {
                      TICK: {
                        target: "calculateNextPositions",
                      },
                    },
                  },
                  calculateNextPositions: {
                    entry: [
                      assign({
                        waitingForResponse: (ctx) => [
                          "pacman",
                          ...Object.keys(ctx.ghosts),
                        ],
                      }),
                      "requestNextPositions",
                    ],
                    on: {
                      UPDATE_POSITION: [
                        {
                          target: "checkCollisions",
                          cond: "allResponsesReceived",
                          actions: ["updatePosition", "clearWaitingFor"],
                        },
                        {
                          actions: [
                            "removeFromWaitlist",
                            "updatePosition",
                            (ctx, event, meta) =>
                              console.log("EVENT MATE", event, meta),
                          ],
                        },
                      ],
                    },
                  },
                  checkCollisions: {
                    entry: [
                      pure((ctx) => {
                        const { pacman, ghosts } = ctx;
                        const checkCollision = (a, b) => {
                          if (
                            a.position.row === b.position.row &&
                            a.position.col === b.position.col
                          ) {
                            return true;
                          }
                        };

                        const ghostsCollidedWith = Object.keys(ghosts).filter(
                          (ghostId) => checkCollision(pacman, ghosts[ghostId])
                        );

                        return ghostsCollidedWith.length > 0
                          ? ghostsCollidedWith.map((ghost) =>
                              send({
                                type: "GHOST_COLLISION",
                                ghosts: [ghost],
                              })
                            )
                          : [
                              send({
                                type: "NO_GHOST_COLLISIONS",
                              }),
                            ];
                      }),
                    ],
                    on: {
                      NO_GHOST_COLLISIONS: {
                        target: "checkDotConsumption",
                      },
                      GHOST_COLLISION: {
                        target: "waiting",
                      },
                    },
                  },
                  checkDotConsumption: {
                    always: [
                      {
                        cond: "pacmanIsEatingPellet",
                        target: "checkWinCondition",
                        actions: [
                          "setTileToEmpty",
                          "incrementPelletsEaten",
                          "notifyPacmanPellet",
                          { type: "awardPoints", points: getPoints("pellet") },
                          (ctx) => send("PELLET_EATEN"),
                        ],
                      },
                      {
                        cond: "pacmanIsEatingPowerPellet",
                        target: "checkWinCondition",
                        actions: [
                          "setTileToEmpty",
                          "notifyPacmanPowerPellet",
                          {
                            type: "awardPoints",
                            points: getPoints("powerPellet"),
                          },
                          "sendGameFrightenedMode",
                        ],
                      },
                      {
                        cond: "pacmanIsEatingFruit",
                        target: "checkWinCondition",
                        actions: [send("FRUIT_EATEN")],
                      },
                      {
                        // technically the game can't finish unless Pacman eats the final pellet
                        // but still going to checkWinCondition for completeness
                        target: "checkWinCondition",
                      },
                    ],
                  },
                  checkWinCondition: {
                    always: [
                      {
                        cond: "eatenAllPellets",
                        target: "waiting",
                        actions: [raise("LEVEL_COMPLETE")],
                      },
                      {
                        target: "waiting",
                      },
                    ],
                  },
                },
                invoke: {
                  id: "tick",
                  src: () => (callback) => {
                    const interval = setInterval(() => {
                      callback("TICK");
                    }, 1000 / 60);

                    return () => {
                      clearInterval(interval);
                    };
                  },
                },
              },
              chaseMode: {
                initial: "normal",
                invoke: {
                  id: "scatterChaseTimer",
                  src: IntervalMachine.withContext({
                    ...IntervalMachine.context,
                    intervals: [
                      { eventType: "CHASE", seconds: 2 },
                      // { eventType: "SCATTER", seconds: 5 },
                      // { eventType: "CHASE", seconds: 5 },
                    ],
                  }),
                },
                states: {
                  normal: {
                    id: "normalChaseMode",
                    initial: "scatterChaseMemory",
                    on: {
                      FRIGHTENED: {
                        target: "frightened",
                        actions: [
                          "notifyFrightenedMode",
                          "pauseScatterChaseTimer",
                        ],
                      },
                      GHOST_COLLISION: {
                        actions: [send("LOSE_LIFE"), "pauseCharacters"],
                      },
                    },
                    states: {
                      scatterChaseMemory: {
                        type: "history",
                        target: "chase",
                      },
                      scatter: {
                        entry: ["notifyScatterMode"],
                        on: {
                          CHASE: {
                            target: "chase",
                          },
                        },
                      },
                      chase: {
                        entry: ["notifyChaseMode"],
                        on: {
                          SCATTER: {
                            target: "scatter",
                          },
                        },
                      },
                    },
                  },
                  frightened: {
                    id: "frightened",
                    initial: "playing",
                    invoke: {
                      id: "frightenedModeTimer",
                      src: IntervalMachine,
                      data: {
                        intervals: (ctx) => [
                          {
                            eventType: "FRIGHT_ENDING_SOON",
                            seconds:
                              ctx.levelConfig.frightenedModeStartDuration,
                          },
                          {
                            eventType: "END_FRIGHTENED_MODE",
                            seconds:
                              ctx.levelConfig.frightenedModeEndingDuration,
                          },
                        ],
                      },
                    },
                    states: {
                      playing: {
                        on: {
                          GHOST_COLLISION: [
                            {
                              cond: "ghostHasBeenRevived",
                              actions: [send("LOSE_LIFE"), "pauseCharacters"],
                            },
                            {
                              cond: "ghostIsAlive",
                              target: "paused",
                              actions: [
                                "clearWaitingFor",
                                "pauseCharacters",
                                "notifyGhostsDead",
                                "updateDeadGhosts",
                                "updateGhostsEatenCount",
                                "pauseFrightenedTimer",
                              ],
                            },
                          ],
                        },
                      },
                      paused: {
                        invoke: {
                          src: IntervalMachine.withContext({
                            ...IntervalMachine.context,
                            intervals: [{ eventType: "RESUME", seconds: 2 }],
                          }),
                        },
                        on: {
                          RESUME: {
                            target: "playing",
                            actions: ["resumeFrightenedTimer", "notifyResume"],
                          },
                        },
                      },
                    },
                    on: {
                      FRIGHTENED: {
                        // pacman could eat another power pellet
                        // exit the state to cancel the callback
                        // otherwise the END event would still happen
                        target: "frightened",
                        internal: false,
                        actions: ["notifyFrightenedMode"],
                      },

                      FRIGHT_ENDING_SOON: {
                        actions: ["notifyFrightEndingSoon"],
                      },
                      END_FRIGHTENED_MODE: {
                        target: "normal",
                        actions: [
                          "notifyEndFrightenedMode",
                          "resumeScatterChaseTimer",
                          "clearRevivedGhosts",
                        ],
                      },
                    },
                    exit: ["clearGhostsEeatenCount"],
                  },
                },
              },
            },
          },
          lostLife: {
            id: "lostLife",
            initial: "stopped",
            states: {
              stopped: {
                after: {
                  2000: {
                    target: "dying",
                    actions: [
                      "tellPacmanAboutDying",
                      "hideGhosts",
                      "removeFruit",
                      "decrementLivesRemaining",
                    ],
                  },
                },
              },
              dying: {
                after: {
                  3000: {
                    target: "finishedDying",
                    actions: ["resetCharacterPositions"],
                  },
                },
              },
              finishedDying: {
                type: "final",
              },
            },
            onDone: [
              {
                cond: "hasLivesRemaining",
                target: "getReady",
              },
              { target: "gameOver" },
            ],
          },
          gameOver: {
            tags: ["gameOver"],
          },
          levelComplete: {
            id: "levelComplete",
            initial: "mazeFlashing",
            states: {
              mazeFlashing: {
                tags: ["mazeFlashing"],
                after: {
                  3000: {
                    target: "fadingOut",
                  },
                },
              },
              fadingOut: {
                tags: ["levelFadeOut"],
                after: {
                  2000: {
                    target: "readyForNextLevel",
                  },
                },
              },
              readyForNextLevel: {
                type: "final",
              },
            },
            onDone: {
              actions: [sendParent("LEVEL_COMPLETE")],
            },
          },
        },
      },
    },
  },
  {
    actions: {
      requestNextPositions: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "GAME_SYNC",
              gameState: createGameStateForCharacters(ctx),
            },
            { to: character }
          )
        );
      }),
      awardPoints: assign({
        totalPoints: (ctx, event, { action }) =>
          ctx.totalPoints + action.points,
      }),
      dropFruit: assign({
        fruit: () => ({
          type: "orange",
          value: getPoints("fruit"),
          position: { row: FRUIT_DROP_ROW, col: FRUIT_DROP_COL },
          ref: spawn(
            Fruit.withContext({
              type: "orange",
              value: getPoints("fruit"),
              position: { row: FRUIT_DROP_ROW, col: FRUIT_DROP_COL },
            }),
            "fruit"
          ),
        }),
      }),
      removeFruit: assign({
        fruit: (ctx) => {
          ctx.fruit?.ref?.stop();
          return undefined;
        },
      }),
      pauseScatterChaseTimer: send(
        { type: "PAUSE" },
        { to: "scatterChaseTimer" }
      ),
      resumeScatterChaseTimer: send(
        { type: "RESUME" },
        { to: "scatterChaseTimer" }
      ),
      pauseFrightenedTimer: send(
        { type: "PAUSE" },
        { to: "frightenedModeTimer" }
      ),
      resumeFrightenedTimer: send(
        { type: "RESUME" },
        { to: "frightenedModeTimer" }
      ),
      clearWaitingFor: assign({ waitingForResponse: [] }),
      removeFromWaitlist: assign({
        waitingForResponse: (ctx, event) =>
          ctx.waitingForResponse.filter((item) => item !== event.character),
      }),
      incrementPelletsEaten: assign({
        pelletsEaten: (ctx) => ctx.pelletsEaten + 1,
      }),
      updatePosition: assign((ctx, event) => {
        if (event.character === "pacman") {
          return {
            ...ctx,
            pacman: {
              ...ctx.pacman,
              position: event.position,
              direction: event.direction,
              requestedDirection: event.requestedDirection,
            },
          };
        } else {
          return {
            ...ctx,
            ghosts: {
              ...ctx.ghosts,
              [event.character]: {
                ...ctx.ghosts[event.character],
                position: event.position,
                direction: event.direction,
                nextDirection: event.nextDirection,
              },
            },
          };
        }
      }),
      updateGhostsEatenCount: assign({
        ghostsEaten: (ctx) => ctx.ghostsEaten + 1,
      }),
      clearGhostsEeatenCount: assign({
        ghostsEaten: 0,
      }),
      updateDeadGhosts: assign({
        deadGhosts: (ctx, event) => {
          return [...ctx.deadGhosts, ...event.ghosts];
        },
      }),
      addRevivedGhost: assign({
        revivedGhosts: (ctx, event) => {
          return [...ctx.revivedGhosts, event.ghost];
        },
      }),
      clearRevivedGhosts: assign({
        revivedGhosts: (ctx, event) => {
          return [];
        },
      }),
      removeGhostFromDeadGhosts: assign({
        deadGhosts: (ctx, event) => {
          console.log(
            "dead ghosts",
            event,
            ctx.deadGhosts.filter((ghost) => ghost !== event.ghost)
          );
          return ctx.deadGhosts.filter((ghost) => ghost !== event.ghost);
        },
      }),
      setTileToEmpty: assign({
        maze: (ctx) => {
          const { pacman, maze } = ctx;
          // deep clone the maze
          const updatedMaze = JSON.parse(JSON.stringify(maze));
          setTileType(updatedMaze.tiles, pacman.position, "empty");
          return updatedMaze;
        },
      }),
      tellPacmanAboutDying: send({ type: "LOSE_LIFE" }, { to: "pacman" }),
      notifyPacmanPellet: send({ type: "EAT_PELLET" }, { to: "pacman" }),
      notifyPacmanPowerPellet: send(
        { type: "EAT_POWER_PELLET" },
        { to: "pacman" }
      ),
      notifyResume: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "RESUME",
            },
            { to: character }
          )
        );
      }),
      notifyAllStart: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "START",
            },
            { to: character }
          )
        );
      }),
      notifyGhostsDead: pure((ctx, event) => {
        return event.ghosts.map((ghost) =>
          send(
            {
              type: "DIED",
            },
            { to: ghost }
          )
        );
      }),
      notifyGhostsGetReady: pure((ctx) => {
        return [...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "GET_READY",
            },
            { to: character }
          )
        );
      }),
      pauseCharacters: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "PAUSE",
            },
            { to: character }
          )
        );
      }),
      hideGhosts: pure((ctx) => {
        return [...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "HIDE_DISPLAY",
            },
            { to: character }
          )
        );
      }),
      notifyFrightenedMode: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "FRIGHTENED",
            },
            { to: character }
          )
        );
      }),
      pinkyLeaveHome: send(
        {
          type: "LEAVE_HOME",
        },
        { to: "pinky" }
      ),
      inkyLeaveHome: send(
        {
          type: "LEAVE_HOME",
        },
        { to: "inky" }
      ),
      clydeLeaveHome: send(
        {
          type: "LEAVE_HOME",
        },
        { to: "clyde" }
      ),
      notifyBlinkyClydeHasLeft: send(
        {
          type: "CLYDE_HAS_LEFT_HOME",
        },
        { to: "blinky" }
      ),
      notifyPersonalCounterIncremented: send("UPDATE_PERSONAL_COUNTER"),
      incrementPersonalCounter: assign({
        pelletCounters: (ctx, event, { action }) => ({
          ...ctx.pelletCounters,
          personal: {
            ...ctx.pelletCounters.personal,
            [action.ghost]: ctx.pelletCounters.personal[action.ghost] + 1,
          },
        }),
      }),
      resetGlobalCounter: assign({
        pelletCounters: (ctx) => ({
          ...ctx.pelletCounters,
          global: 0,
        }),
      }),
      incrementGlobalCounter: assign({
        pelletCounters: (ctx) => ({
          ...ctx.pelletCounters,
          global: ctx.pelletCounter.global + 1,
        }),
      }),
      notifyFrightEndingSoon: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "FRIGHT_ENDING_SOON",
            },
            { to: character }
          )
        );
      }),
      notifyChaseMode: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "CHASE",
            },
            { to: character }
          )
        );
      }),
      notifyScatterMode: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "SCATTER",
            },
            { to: character }
          )
        );
      }),
      sendGameFrightenedMode: send({
        type: "FRIGHTENED",
      }),
      notifyEndFrightenedMode: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "END_FRIGHT",
            },
            { to: character }
          )
        );
      }),
      resetCharacterPositions: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "RESET_POSITION",
              position: characterStartPositions[character],
              direction: characterStartDirections[character],
            },
            { to: character }
          )
        );
      }),
      decrementLivesRemaining: assign({
        livesRemaining: (ctx, event) => ctx.livesRemaining - 1,
      }),
    },
    guards: {
      ghostIsAlive: (ctx, event) => !ctx.deadGhosts.includes(event.ghosts[0]),
      ghostHasBeenRevived: (ctx, event) =>
        ctx.revivedGhosts.includes(event.ghosts[0]),
      noLivesLost: (ctx, event) =>
        ctx.livesRemaining === ctx.numberOfLivesStart,
      allResponsesReceived: (ctx, event) =>
        ctx.waitingForResponse.length === 1 &&
        ctx.waitingForResponse[0] === event.character,
      pacmanIsEatingPellet: (ctx) => {
        const { pacman, maze } = ctx;
        const { position } = pacman;
        const tileType = getTileType(maze.tiles, position);
        return tileType === "pellet";
      },
      pacmanIsEatingFruit: (ctx) => {
        const { fruit, pacman } = ctx;
        if (!fruit) {
          return false;
        }
        return (
          fruit.position.row === pacman.position.row &&
          fruit.position.col === pacman.position.col
        );
      },
      pacmanIsEatingPowerPellet: (ctx) => {
        const { pacman, maze } = ctx;
        const { position } = pacman;
        const tileType = getTileType(maze.tiles, position);
        return tileType === "powerPellet";
      },
      releaseElroy: (ctx) =>
        ctx.maze.pelletsRemaining - ctx.pelletsEaten ===
        ctx.levelConfig.pelletsRemainingElroy,
      elroySecondSpeedup: (ctx) =>
        ctx.maze.pelletsRemaining - ctx.pelletsEaten ===
        ctx.levelConfig.pelletsRemainingElroySpeedup,
      eatenAllPellets: (ctx) =>
        ctx.maze.pelletsRemaining - ctx.pelletsEaten === 0,
      // ctx.pelletsEaten > 5,
      shouldDropFirstFruit: (ctx) => {
        return ctx.pelletsEaten === ctx.levelConfig.pelletsFirstFruit - 1;
      },
      shouldDropSecondFruit: (ctx) =>
        ctx.pelletsEaten === ctx.levelConfig.pelletsSecondFruit - 1,
      pinkyLeavePersonal: (ctx) => ctx.pelletCounters.personal.pinky === 0,
      inkyLeavePersonal: (ctx) => ctx.pelletCounters.personal.inky === 30,
      clydeLeavePersonal: (ctx) => ctx.pelletCounters.personal.clyde === 60,
      hasLivesRemaining: (ctx) => ctx.livesRemaining > 0,
    },
  }
);

export default LevelMachine;
