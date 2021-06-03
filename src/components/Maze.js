import React from "react";
import { maze1 } from "../shared/maze";
import { getTileComponent } from "./tiles/getTileComponent";
const tileSize = 8;

const getColorForType = (type) => {
  const mapColorToType = {
    wall: "blue",
    pellet: "green",
    powerPellet: "green",
  };

  return mapColorToType[type];
};
const Maze = (props) => {
  const maze = maze1;
  const tiles = [];

  maze.forEach((row, i) => {
    row.forEach((tile, j) => {
      const TileComponent = getTileComponent(tile.type, tile.display);
      const color = getColorForType(tile.type);
      tiles.push(
        <TileComponent
          tileSize={tileSize}
          position={{ x: j * tileSize, y: i * tileSize }}
          color={color}
        />
      );
    });
  });
  return <svg>{tiles}</svg>;
};

export default Maze;
