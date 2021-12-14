import { ghostHouseConstants, tileConstants } from "../shared/maze";
import GhostMachine from "./GhostMachine";

const { CENTER_ROW_OFFSET, MAX_COL_OFFSET } = tileConstants;
const {
  GHOST_HOUSE_MIDDLE_ROW,
  GHOST_HOUSE_MIDDLE_COL,
  GHOST_HOUSE_BOTTOM_ROW,
} = ghostHouseConstants;

const START_POSITION = {
  row: GHOST_HOUSE_MIDDLE_ROW,
  col: GHOST_HOUSE_MIDDLE_COL,
  rowOffset: CENTER_ROW_OFFSET,
  colOffset: MAX_COL_OFFSET,
};

const START_DIRECTION = "down";

const PinkyMachine = GhostMachine.withContext({
  ...GhostMachine.context,
  character: "pinky",
  direction: START_DIRECTION,
  position: START_POSITION,
  ghostConfig: {
    scatterTargeting: PinkyScatterTargeting,
    chaseTargeting: PinkyChaseTargeting,
    homeReturnTile: {
      row: GHOST_HOUSE_BOTTOM_ROW,
      col: GHOST_HOUSE_MIDDLE_COL,
    },
    startPosition: START_POSITION,
    startDirection: START_DIRECTION,
  },
});

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
