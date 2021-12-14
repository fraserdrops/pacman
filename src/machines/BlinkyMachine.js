import { createMachine, forwardTo, send } from "xstate";
import { ghostHouseConstants, tileConstants } from "../shared/maze";
import GhostMachine from "./GhostMachine";

const { CENTER_ROW_OFFSET, CENTER_COL_OFFSET } = tileConstants;
const {
  GHOST_HOUSE_MIDDLE_ROW,
  GHOST_HOUSE_MIDDLE_COL,
  GHOST_HOUSE_BOTTOM_ROW,
} = ghostHouseConstants;

const START_POSITION = {
  row: GHOST_HOUSE_MIDDLE_ROW - 3,
  col: GHOST_HOUSE_MIDDLE_COL,
  rowOffset: CENTER_ROW_OFFSET,
  colOffset: CENTER_COL_OFFSET,
};

const START_DIRECTION = "left";
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
        position: START_POSITION,
        direction: START_DIRECTION,
        ghostConfig: {
          scatterTargeting: BlinkyScatterTargeting,
          chaseTargeting: BlinkyChaseTargeting,
          homeReturnTile: {
            row: GHOST_HOUSE_BOTTOM_ROW,
            col: GHOST_HOUSE_MIDDLE_COL,
          },
          startPosition: START_POSITION,
          startDirection: START_DIRECTION,
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
        (ctx) => ({
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: ctx.gameConfig.speedPercentage.elroyOne,
        }),
        { to: "ghost" }
      ),
      elroyLevelTwoSpeedup: send(
        (ctx) => ({
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: ctx.gameConfig.speedPercentage.elroyTwo,
        }),
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
