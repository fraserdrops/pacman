import { actions, assign, createMachine, send } from "xstate";
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
        ...ctx,
        position: {
          row: GHOST_HOUSE_MIDDLE_ROW - 3,
          col: GHOST_HOUSE_MIDDLE_COL,
          rowOffset: CENTER_ROW_OFFSET,
          colOffset: CENTER_COL_OFFSET,
        },
        ghostConfig: {
          scatterTargeting: BlinkyScatterTargeting,
          chaseTargeting: BlinkyChaseTargeting,
          homeReturnTile: {
            GHOST_HOUSE_BOTTOM_ROW,
            col: GHOST_HOUSE_MIDDLE_COL,
          },
        },
      }),
    },
    on: {
      "*": [
        {
          cond: "test",
          actions: ["forwardToGhost", () => console.log("FROM PARENT")],
        },
        {
          actions: ["forwardToParent"],
        },
      ],
    },
    initial: "blinky",
    states: {
      blinky: {},
      elroy: {
        initial: "hist",
        on: {
          LOST_LIFE: {
            target: "dormantElroy",
            actions: ["setBlinkyOptions"],
          },
        },
        states: {
          hist: {
            type: "history",
            target: "levelOne",
          },
          levelOne: {
            entry: ["elroyLevelOneSpeedUp", "elroyTargeting"],
          },
          levelTwo: {
            entry: ["setElroyLevelTwoOptions"],
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
  {
    actions: {
      elroyLevelOneSpeedUp: send(
        {
          type: "UPDATE_NORMAL_SPEED",
          speedPercentage: 1.95,
        },
        { to: "ghost" }
      ),
    },
    elroyTargeting: send(
      {
        type: "UPDATE_SCATTER_TARGETING",
        targetingModule: BlinkyElroyScatterTargeting,
      },
      { to: "blinky" }
    ),
    guards: {
      fromParent: (ctx, event, meta) => meta._event.origin === ctx.parentId,
      test: (ctx, event, meta) => console.log("META FROM PARENT", ctx.parentId),
    },
  }
);

export default BlinkyMachine;

function BlinkyChaseTargeting(callback, onReceive) {
  // Whenever parent sends 'PING',
  // send parent 'PONG' event
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

function BlinkyElroyScatterTargeting(callback, onReceive) {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 17, col: 0 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}
