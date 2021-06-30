import { createMachine, spawn, assign, send, actions } from "xstate";
import PacmanMachine from "./PacmanMachine";
import GhostMachine from "./GhostMachine";
import { maze1, getTileType, setTileType } from "../shared/maze";

const { pure } = actions;
const GHOST_HOUSE_ROW = 17;
const GHOST_HOUSE_LEFT_COL = 12;
const GHOST_HOUSE_MIDDLE_COL = 13;
const GHOST_HOUSE_RIGHT_COL = 14;
const CENTER_COL_OFFSET = 3;
const CENTER_ROW_OFFSET = 4;

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
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  inky: {
    row: GHOST_HOUSE_ROW,
    col: GHOST_HOUSE_LEFT_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  pinky: {
    row: GHOST_HOUSE_ROW,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  clyde: {
    row: GHOST_HOUSE_ROW,
    col: GHOST_HOUSE_RIGHT_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
  blinky: {
    row: GHOST_HOUSE_ROW,
    col: GHOST_HOUSE_MIDDLE_COL,
    rowOffset: CENTER_ROW_OFFSET,
    colOffset: CENTER_COL_OFFSET,
  },
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

const parent = createMachine(
  {
    id: "parent",
    context: {
      pacman: {
        ref: undefined,
      },
      ghosts: {},
      deadGhosts: [],
      maze: maze1,
      waitingForResponse: [],
      gameConfig: {
        frightenedModeStartDuration: 5,
        frightenedModeEndingDuration: 5,
      },
      totalPoints: 0,
      ghostsEaten: 0,
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
                  position: {
                    row: 26,
                    col: 13,
                    rowOffset: 4,
                    colOffset: 3,
                  },
                  direction: "left",
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
                    ghostConfig: {
                      scatterTargetTile: {
                        row: 15,
                        col: 15,
                      },
                      targetTile: {
                        row: 1,
                        col: 1,
                      },
                      homeTile: characterStartPositions.inky,
                    },
                  }),
                  "inky"
                ),
              },
              pinky: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "pinky",
                    position: characterStartPositions.pinky,
                    ghostConfig: {
                      scatterTargetTile: {
                        row: 3,
                        col: 3,
                      },
                      targetTile: {
                        row: 12,
                        col: 12,
                      },
                      homeTile: characterStartPositions.pinky,
                    },
                  }),
                  "pinky"
                ),
              },
              clyde: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "clyde",
                    position: characterStartPositions.clyde,
                    ghostConfig: {
                      scatterTargetTile: {
                        row: 12,
                        col: 3,
                      },
                      targetTile: {
                        row: 12,
                        col: 3,
                      },
                      homeTile: characterStartPositions.clyde,
                    },
                  }),
                  "clyde"
                ),
              },
              blinky: {
                ref: spawn(
                  GhostMachine.withContext({
                    ...GhostMachine.context,
                    maze: ctx.maze,
                    character: "blinky",
                    position: characterStartPositions.blinky,
                    ghostConfig: {
                      scatterTargetTile: {
                        row: 3,
                        col: 12,
                      },
                      targetTile: {
                        row: 12,
                        col: 3,
                      },
                      homeTile: characterStartPositions.blinky,
                    },
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
                        const { pacman, ghosts, deadGhosts } = ctx;
                        const checkCollision = (a, b) => {
                          if (
                            a.position.row === b.position.row &&
                            a.position.col === b.position.col
                          ) {
                            return true;
                          }
                        };
                        const aliveGhosts = Object.keys(ghosts).filter(
                          (ghostId) => !deadGhosts.includes(ghostId)
                        );
                        let ghostsCollidedWith = [];
                        aliveGhosts.forEach((ghostName) => {
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
                          actions: ["pauseCharacters"],
                        },
                        {
                          target: "#ghostDied",
                          actions: [
                            "clearWaitingFor",
                            "pauseCharacters",
                            "notifyGhostsDead",
                            "updateDeadGhosts",
                          ],
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
                        actions: [
                          "setTileToEmpty",
                          "notifyPacmanPellet",
                          { type: "awardPoints", points: getPoints("pellet") },
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
                    }, 1000 / 40);

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
                          { mode: "SCATTER", startTime: 5 },
                        ];
                        chaseScatterMode.forEach((period) => {
                          setTimeout(() => {
                            callback(period.mode);
                          }, period.startTime * 1000);
                        });
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
                            actions: ["notifyScatterMode"],
                          },
                        },
                      },
                    },
                  },
                  frightened: {
                    id: "frightened",
                    initial: "frightStarted",
                    states: {
                      frightStarted: {
                        invoke: {
                          id: "frightenedModeTimer",
                          src: (ctx) => (callback) => {
                            const interval = setInterval(() => {
                              callback("FRIGHT_ENDING_SOON");
                            }, ctx.gameConfig.frightenedModeStartDuration * 1000);
                            return () => {
                              clearInterval(interval);
                            };
                          },
                        },
                        on: {
                          FRIGHT_ENDING_SOON: {
                            target: "frightEnding",
                            actions: ["notifyFrightEndingSoon"],
                          },
                        },
                      },
                      frightEnding: {
                        invoke: {
                          id: "frightenedModeTimer",
                          src: (ctx) => (callback) => {
                            const interval = setInterval(() => {
                              callback("END_FRIGHTENED_MODE");
                            }, ctx.gameConfig.frightenedModeEndingDuration * 1000);
                            return () => {
                              clearInterval(interval);
                            };
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
            initial: "stopped",
            states: {
              stopped: {
                after: {
                  2000: {
                    target: "dying",
                    actions: ["tellPacmanAboutDying", "hideGhosts"],
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
                type: "fina",
              },
            },
            onDone: {
              target: "getReady",
            },
          },
          ghostDied: {
            id: "ghostDied",
            after: {
              2000: {
                actions: ["notifyResume"],
                target: "playing",
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
      awardPoints: assign({
        totalPoints: (ctx, event, { action }) =>
          ctx.totalPoints + action.points,
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
                nextDirection: event.nextDirection,
              },
            },
          };
        }
      }),
      updateDeadGhosts: assign({
        deadGhosts: (ctx, event) => {
          return [...ctx.deadGhosts, ...event.ghosts];
        },
      }),
      setTileToEmpty: assign({
        maze: (ctx) => {
          const { pacman, maze } = ctx;
          const updatedMaze = { ...maze };
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
