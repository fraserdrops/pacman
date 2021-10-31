import { actions, assign, createMachine, forwardTo, send } from "xstate";
import { getTileType } from "../shared/maze";
import GhostMachine from "./GhostMachine";
const { raise, respond, choose } = actions;

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
const BlinkyMachine = createMachine(
  {
    id: "BlinkyMachine",
    context: {},
    invoke: {
      id: "ghost",
      src: GhostMachine,
      data: (ctx) => ({
        ...GhostMachine.context,
        ...ctx,
        character: "blinky",
        position: {
          row: GHOST_HOUSE_MIDDLE_ROW - 3,
          col: GHOST_HOUSE_MIDDLE_COL,
          rowOffset: CENTER_ROW_OFFSET,
          colOffset: CENTER_COL_OFFSET,
        },
        direction: "left",
        ghostConfig: {
          scatterTargeting: BlinkyScatterTargeting, // actor submodule
          chaseTargeting: BlinkyChaseTargeting, // actor submodule
          homeReturnTile: {
            GHOST_HOUSE_BOTTOM_ROW,
            col: GHOST_HOUSE_MIDDLE_COL,
          },
        },
      }),
    },
    on: {
      GAME_SYNC: {
        actions: [
          "forwardToGhost",

          (ctx, event) =>
            console.log("BLINKY SYNCY", event.gameState.pelletsRemaining),
        ],
      },
      // if we aren't intercepting the message, then pass it through
      "*": [
        {
          cond: "fromParent",
          actions: ["forwardToGhost"],
        },
        {
          actions: ["forwardToParent"],
        },
      ],
    },
    type: "parallel",
    states: {
      passthrough: {
        on: {
          // if we aren't intercepting the message, then pass it through
          "*": [
            {
              cond: "fromParent",
              actions: ["forwardToGhost"],
            },
            {
              actions: ["forwardToParent"],
            },
          ],
        },
      },
      decorator: {
        initial: "blinky",
        states: {
          blinky: {
            on: {
              GAME_SYNC: [
                {
                  cond: "releaseElroy",
                  target: "elroy",
                },
              ],
            },
          },
          elroy: {
            entry: ["elroyTargeting"],
            initial: "hist",
            on: {
              LOSE_LIFE: {
                target: "dormantElroy",
                actions: ["setBlinkySpeed", "setBlinkyScatterTargeting"],
              },
            },
            states: {
              hist: {
                type: "history",
                target: "levelOne",
              },
              levelOne: {
                entry: ["elroyLevelOneSpeedup"],
                on: {
                  GAME_SYNC: [
                    {
                      cond: "elroyLevelTwo",
                      target: "levelTwo",
                    },
                  ],
                },
              },
              levelTwo: {
                entry: ["elroyLevelTwoSpeedup"],
              },
            },
          },
          dormantElroy: {
            CLYDE_HAS_LEFT_HOME: {
              target: "elroy",
            },
          },
        },
      },
    },
  },
  {
    actions: {
      forwardToGhost: forwardTo("ghost"),
      forwardToParent: forwardTo((ctx) => ctx.parentId),
      elroyLevelOneSpeedup: send(
        {
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: 0.3,
        },
        { to: "ghost" }
      ),
      elroyLevelTwoSpeedup: send(
        {
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: 2,
        },
        { to: "ghost" }
      ),
      elroyTargeting: send(
        {
          type: "UPDATE_SCATTER_TARGETING",
          targetingModule: BlinkyChaseTargeting,
        },
        { to: "ghost" }
      ),
      setBlinkySpeed: send(
        (ctx) => ({
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: ctx.gameConfig.speedPercentage.normal,
        }),
        { to: "ghost" }
      ),
      setBlinkyScatterTargeting: send(
        {
          type: "UPDATE_SCATTER_TARGETING",
          targetingModule: BlinkyScatterTargeting,
        },
        { to: "ghost" }
      ),
    },

    guards: {
      fromParent: (ctx, event, meta) => meta._event.origin === ctx.parentId,
      releaseElroy: (ctx, event) => {
        return (
          event.gameState.pelletsRemaining ===
          ctx.gameConfig.pelletsRemainingElroy
        );
      },
      elroyLevelTwo: (ctx, event) => {
        return (
          event.gameState.pelletsRemaining ===
          ctx.gameConfig.pelletsRemainingElroySpeedup
        );
      },
    },
  }
);

export default BlinkyMachine;

function BlinkyChaseTargeting(callback, onReceive) {
  // Whenever parent sends 'PING',
  // send parent 'PONG' event

  console.log("BLINKY CHASE TARGETING");
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const { gameState } = event;
      const targetTile = { ...gameState.pacman.position };

      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}

function BlinkyScatterTargeting(callback, onReceive) {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 0, col: 25 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}
