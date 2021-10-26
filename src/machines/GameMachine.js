import { assign, createMachine, forwardTo, spawn } from "xstate";
import LevelMachine from "./LevelMachine";

const NUMBER_OF_LIVES = 3;
const NUMBER_OF_LEVELS = 2;

const getLevelConfig = (levelNumber) => {
  const levelConfig = {
    1: {
      frightenedModeStartDuration: 5,
      frightenedModeEndingDuration: 5,
      pelletsFirstFruit: 12,
      pelletsSecondFruit: 50,
      pelletsRemainingElroy: 230,
      pelletsRemainingElroySpeedup: 10,
      pacman: {
        normalSpeedPercentage: 0.8,
        frightenedSpeedPercentage: 0.9,
      },
      ghosts: {
        tunnelSpeedPercentage: 0.4,
        normalSpeedPercentage: 0.75,
        frightenedSpeedPercentage: 0.5,
      },
    },
    2: {
      frightenedModeStartDuration: 5,
      frightenedModeEndingDuration: 5,
      pelletsFirstFruit: 12,
      pelletsSecondFruit: 50,
      pelletsRemainingElroy: 230,
      pelletsRemainingElroySpeedup: 10,
      pacman: {
        normalSpeedPercentage: 0.8,
        frightenedSpeedPercentage: 0.9,
      },
      ghosts: {
        tunnelSpeedPercentage: 0.4,
        normalSpeedPercentage: 1.75,
        frightenedSpeedPercentage: 0.5,
      },
    },
    3: {
      frightenedModeStartDuration: 5,
      frightenedModeEndingDuration: 5,
      pelletsFirstFruit: 12,
      pelletsSecondFruit: 50,
      pelletsRemainingElroy: 230,
      pelletsRemainingElroySpeedup: 10,
      pacman: {
        normalSpeedPercentage: 0.8,
        frightenedSpeedPercentage: 0.9,
      },
      ghosts: {
        tunnelSpeedPercentage: 0.4,
        normalSpeedPercentage: 1.75,
        frightenedSpeedPercentage: 0.5,
      },
    },
  };

  return levelConfig[levelNumber];
};

const initialContext = {
  livesRemaining: NUMBER_OF_LIVES,
  currentLevel: undefined,
  levelNumber: 1,
};
const GameMachine = createMachine(
  {
    id: "game",
    initial: "readyToPlay",
    context: initialContext,
    states: {
      readyToPlay: {
        tags: ["readyToPlay"],
        on: { PLAY_GAME: { target: "initLevel" } },
      },
      initLevel: {
        always: {
          target: "playingLevel",
          actions: ["makeLevel"],
        },
      },
      playingLevel: {
        tags: ["playingLevel"],
        on: {
          LEVEL_COMPLETE: [
            {
              cond: "allLevelsCompleted",
              target: "gameCompleted",
            },
            {
              target: "initLevel",
              actions: ["incrementLevelNumber"],
            },
          ],
          GAME_OVER: {
            target: "readyToPlay",
            actions: ["resetGame"],
          },
          LEFT_ARROW: {
            actions: ["forwardToLevel"],
          },
          RIGHT_ARROW: {
            actions: ["forwardToLevel"],
          },
          UP_ARROW: {
            actions: ["forwardToLevel"],
          },
          DOWN_ARROW: {
            actions: ["forwardToLevel"],
          },
        },
      },
      gameCompleted: {
        tags: ["gameCompleted"],
        on: {
          PLAY_AGAIN: {
            target: "initLevel",
            actions: ["resetGame"],
          },
        },

        after: {
          7000: "readyToPlay",
        },
      },
      ready: {},
    },
  },
  {
    actions: {
      incrementLevelNumber: assign({
        levelNumber: (ctx) => ctx.levelNumber + 1,
      }),
      forwardToLevel: forwardTo((ctx) => ctx.currentLevel),
      makeLevel: assign({
        currentLevel: (ctx) =>
          spawn(
            LevelMachine.withContext({
              ...LevelMachine.context,
              livesRemaining: ctx.livesRemaining,
              numberOfLivesStart: NUMBER_OF_LIVES,
              levelConfig: getLevelConfig(ctx.levelNumber),
            })
          ),
      }),
      resetGame: assign(() => initialContext),
    },
    guards: {
      allLevelsCompleted: (ctx) => ctx.levelNumber === NUMBER_OF_LEVELS,
    },
  }
);

export default GameMachine;
