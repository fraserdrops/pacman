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

const PinkyMachine = createMachine(
  {
    id: "PinkyMachine",
    context: {},
    invoke: {
      id: "ghost",
      src: GhostMachine,
      data: (ctx) => ({
        ...GhostMachine.context,
        ...ctx,
        character: "pinky",
        direction: "down",
        position: {
          row: GHOST_HOUSE_MIDDLE_ROW,
          col: GHOST_HOUSE_MIDDLE_COL,
          rowOffset: CENTER_ROW_OFFSET,
          colOffset: MAX_COL_OFFSET,
        },
        ghostConfig: {
          scatterTargeting: PinkyScatterTargeting,
          chaseTargeting: PinkyChaseTargeting,
          homeReturnTile: {
            row: GHOST_HOUSE_BOTTOM_ROW,
            col: GHOST_HOUSE_MIDDLE_COL,
          },
        },
      }),
    },
    on: {
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
  {
    actions: {
      forwardToGhost: forwardTo("ghost"),
      forwardToParent: forwardTo((ctx) => ctx.parentId),
    },

    guards: {
      fromParent: (ctx, event, meta) => meta._event.origin === ctx.parentId,
    },
  }
);

export default PinkyMachine;

function PinkyChaseTargeting(callback, onReceive) {
  // Whenever parent sends 'PING',
  // send parent 'PONG' event
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const { gameState } = event;
      const { pacman } = gameState;
      let targetTile = { row: 0, col: 0 };
      if (pacman.direction === "up") {
        targetTile = {
          row: pacman.position.row - 4,
          col: pacman.position.col - 4,
        };
      }

      if (pacman.direction === "down") {
        targetTile = { row: pacman.position.row + 4, col: pacman.position.col };
      }

      if (pacman.direction === "left") {
        targetTile = { row: pacman.position.row, col: pacman.position.col - 4 };
      }

      if (pacman.direction === "right") {
        targetTile = { row: pacman.position.row, col: pacman.position.col + 4 };
      }

      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}

function PinkyScatterTargeting(callback, onReceive) {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 0, col: 2 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}
