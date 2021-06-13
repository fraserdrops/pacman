import { createMachine, spawn, assign, send, actions } from "xstate";
import PacmanMachine from "./PacmanMachine";
import GhostMachine from "./GhostMachine";
import { maze1, getTileType, setTileType } from "../shared/maze";

const { pure } = actions;
const GHOST_HOUSE_ROW = 10;
const GHOST_HOUSE_LEFT_COL = 10;
const GHOST_HOUSE_MIDDLE_COL = 11;
const GHOST_HOUSE_RIGHT_COL = 12;

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
    row: 3,
    col: 3,
    rowOffset: 4,
    colOffset: 3,
  },
  inky: {
    row: GHOST_HOUSE_ROW,
    col: GHOST_HOUSE_LEFT_COL,
    rowOffset: 4,
    colOffset: 3,
  },
  pinky: {
    row: GHOST_HOUSE_ROW - 1,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: 4,
    colOffset: 4,
  },
  clyde: {
    row: GHOST_HOUSE_ROW - 1,
    col: GHOST_HOUSE_RIGHT_COL,
    rowOffset: 4,
    colOffset: 4,
  },
  blinky: {
    row: GHOST_HOUSE_ROW - 1,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: 4,
    colOffset: 3,
  },
};

const parent = createMachine(
  {
    id: "parent",
    context: {
      pacman: {
        ref: undefined,
      },
      ghosts: {},
      maze: maze1,
      waitingForResponse: [],
      gameConfig: {
        frightenedModeDuration: 10,
      },
    },
    initial: "initial",
    states: {
      initial: {
        entry: [
          assign({
            pacman: (ctx) => ({
              ref: spawn(
                PacmanMachine.withContext({
                  ...PacmanMachine.context,
                  maze: ctx.maze,
                  position: characterStartPositions.pacman,
                }),
                "pacman"
              ),
            }),
            ghosts: (ctx) => ({
              inky: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "inky",
                    position: characterStartPositions.inky,
                    targetTile: {
                      row: 1,
                      col: 2,
                    },
                  }),
                  "inky"
                ),
              },
              // pinky: {
              //   ref: spawn(
              //     GhostMachine.withContext({
              //       ...GhostMachine.context,
              //       maze: ctx.maze,
              //       character: "pinky",
              //       position: characterStartPositions.pinky,
              //       targetTile: {
              //         row: 1,
              //         col: 2,
              //       },
              //     }),
              //     "pinky"
              //   ),
              // },
              // clyde: {
              //   ref: spawn(
              //     GhostMachine.withContext({
              //       ...GhostMachine.context,
              //       maze: ctx.maze,
              //       character: "clyde",
              //       position: characterStartPositions.clyde,
              //       targetTile: {
              //         row: 1,
              //         col: 2,
              //       },
              //     }),
              //     "clyde"
              //   ),
              // },
              // blinky: {
              //   ref: spawn(
              //     GhostMachine.withContext({
              //       ...GhostMachine.context,
              //       maze: ctx.maze,
              //       character: "blinky",
              //       position: characterStartPositions.blinky,
              //       targetTile: {
              //         row: 1,
              //         col: 2,
              //       },
              //     }),
              //     "blinky"
              //   ),
              // },
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
        states: {
          getReady: {
            after: {
              1000: {
                target: "playing",
              },
            },
          },
          playing: {
            type: "parallel",
            on: {
              LEFT_ARROW: {
                actions: [send({ type: "LEFT" }, { to: "pacman" })],
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
              PAUSE: {
                target: "paused",
              },
              GAME_OVER: {
                target: "gameOver",
              },
              LEVEL_COMPLETE: {
                target: "levelComplete",
              },
            },
            states: {
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
                          actions: ["removeFromWaitlist", "updatePosition"],
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

                        let ghostsCollidedWith = [];
                        Object.keys(ghosts).forEach((ghostName) => {
                          if (checkCollision(pacman, ghosts[ghostName])) {
                            ghostsCollidedWith.push(ghostName);
                          }
                        });

                        return ghostsCollidedWith.length > 0
                          ? [
                              send({
                                type: "GHOST_COLLISION",
                                ghosts: ghostsCollidedWith,
                              }),
                            ]
                          : [
                              send({
                                type: "NO_GHOST_COLLISIONS",
                              }),
                            ];
                      }),
                    ],
                    on: {
                      GHOST_COLLISION: [
                        {
                          in: "#normalChaseMode",
                          target: "#lostLife",
                          actions: [""],
                        },
                        {
                          target: "checkDotConsumption",
                          actions: ["clearWaitingFor"],
                        },
                      ],
                      NO_GHOST_COLLISIONS: {
                        target: "checkDotConsumption",
                      },
                    },
                  },
                  checkDotConsumption: {
                    always: [
                      {
                        cond: "pacmanIsEatingPellet",
                        target: "checkWinCondition",
                        actions: ["setTileToEmpty", "notifyPacmanPellet"],
                      },
                      {
                        cond: "pacmanIsEatingPowerPellet",
                        target: "checkWinCondition",
                        actions: [
                          "setTileToEmpty",
                          "notifyPacmanPowerPellet",
                          "sendGameFrightenedMode",
                        ],
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
                        target: "#victory",
                        cond: "eatenAllPellets",
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
                    }, 100);

                    return () => {
                      clearInterval(interval);
                    };
                  },
                },
              },
              chaseMode: {
                initial: "normal",
                states: {
                  normal: {
                    id: "normalChaseMode",
                    initial: "scatter",
                    invoke: {
                      id: "chaseModeTimer",
                      src: () => (callback) => {
                        const chaseScatterMode = [
                          { mode: "CHASE", startTime: 2 },
                        ];
                        chaseScatterMode.forEach((period) => {
                          setTimeout(() => {
                            callback(period.mode);
                          }, period.startTime * 1000);
                        });
                        const interval = setInterval(() => {
                          callback("TICK");
                        }, 2000);

                        return () => {
                          clearInterval(interval);
                        };
                      },
                    },
                    on: {
                      FRIGHTENED: {
                        target: "frightened",
                        actions: ["notifyFrightenedMode"],
                      },
                    },
                    states: {
                      scatter: {
                        on: {
                          CHASE: {
                            target: "chase",
                            actions: ["notifyChaseMode"],
                          },
                        },
                      },
                      chase: {
                        on: {
                          SCATTER: {
                            target: "scatter",
                          },
                        },
                      },
                    },
                  },
                  frightened: {
                    id: "hideChaseMode",
                    invoke: {
                      id: "frightenedModeTimer",
                      src: (ctx) => (callback) => {
                        const interval = setInterval(() => {
                          callback("END_FRIGHTENED_MODE");
                        }, ctx.gameConfig.frightenedModeDuration * 1000);
                        return () => {
                          clearInterval(interval);
                        };
                      },
                    },
                    on: {
                      FRIGHTENED: {
                        // exit the state to cancel the callback
                        // otherwise the END event would still happen
                        target: "frightened",
                      },
                      END_FRIGHTENED_MODE: {
                        target: "normal",
                        actions: ["notifyEndFrightenedMode"],
                      },
                    },
                  },
                },
              },
            },
          },
          lostLife: {
            id: "lostLife",
            after: {
              3000: {
                target: "getReady",
                actions: ["resetCharacterPositions"],
              },
            },
          },
          paused: {
            on: {
              PLAY: {
                target: "playing",
              },
            },
          },
          gameOver: {
            on: {
              RESTART_GAME: {
                target: "getReady",
              },
            },
          },
          levelComplete: {
            on: {
              RESTART_GAME: {
                target: "getReady",
              },
            },
          },
          victory: {
            id: "victory",
            on: {
              RESTART_GAME: {
                target: "getReady",
              },
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

      clearWaitingFor: assign({ waitingForResponse: [] }),
      removeFromWaitlist: assign({
        waitingForResponse: (ctx, event) =>
          ctx.waitingForResponse.filter((item) => item !== event.character),
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
              },
            },
          };
        }
      }),
      setTileToEmpty: assign({
        maze: (ctx) => {
          const { pacman, maze } = ctx;
          const updatedMaze = { ...maze };
          setTileType(updatedMaze.tiles, pacman.position, "empty");
          return updatedMaze;
        },
      }),
      notifyPacmanPellet: send({ type: "EAT_PELLET" }, { to: "pacman" }),
      notifyPacmanPowerPellet: send(
        { type: "EAT_POWER_PELLET" },
        { to: "pacman" }
      ),
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
      notifyScatterMode: pure((ctx) => {
        return ["pacman", ...Object.keys(ctx.ghosts)].map((character) =>
          send(
            {
              type: "FRIGHTENED",
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
            },
            { to: character }
          )
        );
      }),
    },
    guards: {
      allResponsesReceived: (ctx, event) =>
        ctx.waitingForResponse.length === 1 &&
        ctx.waitingForResponse[0] === event.character,
      pacmanIsEatingPellet: (ctx) => {
        const { pacman, maze } = ctx;
        const { position } = pacman;
        const tileType = getTileType(maze.tiles, position);
        return tileType === "pellet";
      },
      pacmanIsEatingPowerPellet: (ctx) => {
        const { pacman, maze } = ctx;
        const { position } = pacman;
        const tileType = getTileType(maze.tiles, position);
        return tileType === "powerPellet";
      },
      eatenAllPellets: (ctx) => ctx.pelletsRemaining === 0,
    },
  }
);

export default parent;
