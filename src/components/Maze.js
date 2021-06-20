import React from "react";
import { getTileComponent } from "./tiles/getTileComponent";
const tileSize = 8;

const getColorForType = (type) => {
  const mapColorToType = {
    wall: "blue",
    pellet: "green",
    powerPellet: "green",
    houseEntrance: "pink",
  };

  return mapColorToType[type];
};
const Maze = React.memo((props) => {
  const { maze } = props;
  const tiles = [];

  maze.tiles.forEach((row, i) => {
    row.forEach((tile, j) => {
      const TileComponent = getTileComponent(tile.type, tile.display);
      const color = getColorForType(tile.type);
      tiles.push(
        <TileComponent
          key={`${i}, ${j}`}
          tileSize={tileSize}
          position={{ x: j * tileSize, y: i * tileSize }}
          color={color}
        />
      );
    });
  });
  return (
    <g>
      <rect width={28 * tileSize} height={36 * tileSize} fill="black" />
      {tiles}
    </g>
  );
});

export default Maze;
