export const BlinkyChaseTargeting = (callback, onReceive) => {
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
};

export const BlinkyScatterTargeting = (callback, onReceive) => {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 0, col: 25 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
};

export const BlinkyElroyScatterTargeting = (callback, onReceive) => {
  onReceive((event) => {
    if (event.type === "CALCULATE_TARGET_TILE") {
      const targetTile = { row: 17, col: 0 };
      callback({
        type: "NEW_TARGET_TILE",
        targetTile,
      });
    }
  });
};
