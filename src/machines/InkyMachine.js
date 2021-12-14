import GhostMachine from "./GhostMachine";
import { tileConstants, ghostHouseConstants } from "../shared/maze";

const { CENTER_ROW_OFFSET, MAX_COL_OFFSET } = tileConstants;
const { GHOST_HOUSE_MIDDLE_ROW, GHOST_HOUSE_LEFT_COL, GHOST_HOUSE_BOTTOM_ROW } =
  ghostHouseConstants;

const START_POSITION = {
  row: GHOST_HOUSE_MIDDLE_ROW,
  col: GHOST_HOUSE_LEFT_COL,
  rowOffset: CENTER_ROW_OFFSET,
  colOffset: MAX_COL_OFFSET,
};
const START_DIRECTION = "up";

const InkyMachine = GhostMachine.withContext({
  ...GhostMachine.context,
  character: "inky",
  direction: START_DIRECTION,
  position: START_POSITION,
  ghostConfig: {
    scatterTargeting: InkyScatterTargeting,
    chaseTargeting: InkyChaseTargeting,
    homeReturnTile: {
      row: GHOST_HOUSE_BOTTOM_ROW,
      col: GHOST_HOUSE_LEFT_COL,
    },
    startPosition: START_POSITION,
    startDirection: START_DIRECTION,
  },
});

export default InkyMachine;

const euclideanDistance = (x1, y1, x2, y2) =>
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

const SCATTER_TILE = { row: 28, col: 2 };
function InkyChaseTargeting(callback, onReceive) {
  // Whenever parent sends 'PING',
  // send parent 'PONG' event
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const { gameState } = event;
      const { pacman } = gameState;
      let targetTile = SCATTER_TILE;
      if (
        euclideanDistance(
          pacman.position.row,
          pacman.position.col,
          gameState.inky.position.row,
          gameState.inky.position.col
        ) > 8
      ) {
        targetTile = { ...pacman.position };
      }

      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}

function InkyScatterTargeting(callback, onReceive) {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = SCATTER_TILE;
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
}
