// 28 x 36
// 5 'types' wall, pellet, powerpellet, empty, houseEntrance

const createNTiles = (N, type, display) => {
  let tiles = [];
  for (let i = 0; i < N; i++) {
    tiles.push({ type, display });
  }
  return tiles;
};

const reflectTile = (tile) => {
  if (tile.type !== "wall") {
    return { ...tile };
  }
  const { display } = tile;
  let mapReflectedOrientation = {
    tl: "tr",
    tr: "tl",
    bl: "br",
    br: "bl",
    ll: "rr",
    lr: "rl",
    rl: "lr",
    rr: "ll",
    left: "right",
    right: "left",
    top: "top",
    bottom: "bottom",
    all: "all",
  };
  let originalOrientation = display.orientation;
  let reflectedOrientation = mapReflectedOrientation[originalOrientation];
  return {
    ...tile,
    display: { ...tile.display, orientation: reflectedOrientation },
  };
};

const positionWithinRange = (position, start, end) => {
  return (
    start.row <= position.row &&
    position.row <= end.row &&
    start.col <= position.col &&
    position.col <= end.col
  );
};

export const getZone = (maze, position) => {
  const { zones } = maze;
  Object.keys(zones).forEach((zoneName) => {
    const { start, end } = zones[zoneName];
    if (positionWithinRange(position, start, end)) {
      return zoneName;
    }
  });
};

const createRowFromHalf = (tiles) => {
  const row = [...tiles.flat(4)];
  for (let i = row.length - 1; i >= 0; i--) {
    row.push(reflectTile(tiles[i]));
  }
  return row.flat(4);
};

export const getTileType = (maze, position) => {
  return maze[position.row][position.col].type;
};

export const setTileType = (maze, position, type) => {
  if (maze[position.row] && maze[position.row][position.col]) {
    maze[position.row][position.col].type = type;
  }
};

export const getTileDisplay = (maze, position) => {
  return maze[position.row][position.col].display;
};

export const maze1Tiles = [
  createRowFromHalf([...createNTiles(14, "empty")]),
  createRowFromHalf([...createNTiles(14, "empty")]),
  createRowFromHalf([...createNTiles(14, "empty")]),
  // row 0
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(12, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "internal",
      orientation: "tr",
    }),
  ]),
  // row 1
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(12, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // row 2
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),
  // row 3
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "powerPellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // row 4
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
  ]),

  // row 5
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(13, "pellet"),
  ]),

  //row 6
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
  ]),

  // row 7
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
  ]),
  // row 8
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(6, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(4, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // row 9
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(4, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "smallCorner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),

    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // row 10
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),

    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
  ]),

  // row 11
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(5, "empty"),
  ]),

  // row 12
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "house",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "houseEntrance"),
  ]),

  // row 13
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "smallCorner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(3, "empty"),
  ]),

  // 14
  createRowFromHalf([
    ...createNTiles(6, "tunnel"),
    ...createNTiles(1, "pellet"),
    ...createNTiles(3, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(3, "empty"),
  ]),

  //15
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "smallCorner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(3, "empty"),
  ]),

  // 16
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "house",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "top",
    }),
  ]),

  // 17
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(5, "empty"),
  ]),

  // 18
  createRowFromHalf([
    ...createNTiles(5, "wall", {
      wallType: "internal",
      variant: "filled",
      orientation: "all",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
  ]),

  // 19
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(4, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "smallCorner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "empty"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
  ]),

  // 20
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(12, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // 21
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  // 22
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
  ]),

  //23
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "powerPellet"),
    ...createNTiles(2, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),

    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(7, "pellet"),
    ...createNTiles(1, "empty"),
  ]),

  // 24
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "internal",
      orientation: "ll",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(3, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
  ]),

  //25
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "internal",
      orientation: "lr",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),

    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
  ]),

  //26
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(6, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),

    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(4, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),

  //27
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tl",
    }),
    ...createNTiles(4, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(2, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "top",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "tr",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "right",
    }),
  ]),
  //28
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(8, "wall", {
      wallType: "internal",
      variant: "straight",
      orientation: "bottom",
    }),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "br",
    }),
    ...createNTiles(1, "pellet"),
    ...createNTiles(1, "wall", {
      wallType: "internal",
      variant: "corner",
      orientation: "bl",
    }),
  ]),

  // 29
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "left",
    }),
    ...createNTiles(13, "pellet"),
  ]),

  // 31
  createRowFromHalf([
    ...createNTiles(1, "wall", {
      wallType: "external",
      variant: "corner",
      orientation: "bl",
    }),
    ...createNTiles(13, "wall", {
      wallType: "external",
      variant: "straight",
      orientation: "bottom",
    }),
  ]),
  createRowFromHalf([...createNTiles(14, "empty")]),
  createRowFromHalf([...createNTiles(14, "empty")]),
];

let maze1PelletsRemaining = 0;
maze1Tiles.forEach((row, rowIndex) => {
  row.forEach((tile, colIndex) => {
    if (tile.type === "pellet") {
      maze1PelletsRemaining++;
    }
  });
});

export const maze1 = {
  tiles: maze1Tiles,
  zones: {
    redZones: [
      {
        start: { row: 14, col: 11 },
        end: { row: 14, col: 15 },
      },
      {
        start: { row: 26, col: 11 },
        end: { row: 26, col: 15 },
      },
    ],
    tunnels: [
      {
        start: { row: 17, col: 0 },
        end: { row: 17, col: 5 },
      },
      {
        start: { row: 17, col: 27 },
        end: { row: 17, col: 22 },
      },
    ],
    ghostHouse: {
      start: { row: 16, col: 11 },
      end: { row: 18, col: 16 },
    },
    ghostHouseEntrance: {
      start: { row: 15, col: 13 },
      end: { row: 15, col: 14 },
    },
  },
  numCols: maze1Tiles[0].length,
  numRows: maze1Tiles.length,
  pelletsRemaining: maze1PelletsRemaining,
};
