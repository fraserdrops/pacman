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
    return tile;
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

const createRowFromHalf = (tiles) => {
  const row = [...tiles.flat(4)];
  for (let i = row.length - 1; i >= 0; i--) {
    row.push(reflectTile(tiles[i]));
  }
  return row.flat(4);
};

export const maze1 = [
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
];
