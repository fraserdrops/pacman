export const PinkyChaseTargeting = (callback, onReceive) => {
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
};

export const PinkyScatterTargeting = (callback, onReceive) => {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 0, col: 2 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
};
