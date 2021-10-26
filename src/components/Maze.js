import React from "react";
import { getTileComponent } from "./tiles/getTileComponent";
import styles from "./Maze.module.css";

const getColorForType = (type) => {
  const mapColorToType = {
    wall: "blue",
    pellet: "#fbe9e7",
    powerPellet: "#ffccbc",
    houseEntrance: "pink",
  };

  return mapColorToType[type];
};

const getClassForType = (type, flashing) => {
  const mapColorToType = {
    wall: flashing ? styles.wallFlashing : styles.walls,
  };

  return mapColorToType[type];
};
const Maze = React.memo((props) => {
  const { maze, tileSize, flashing } = props;
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
          className={getClassForType(tile.type, flashing)}
        />
      );
    });
  });
  return (
    <g>
      <rect width={28 * tileSize} height={36 * tileSize} fill="black" />
      {tiles}
      <g
        transform={`translate(${11 * tileSize}
    ${14 * tileSize})`}
      >
        <rect width="8" height="8" stroke="green" strokeWidth="1" fill="none" />
      </g>
    </g>
  );
});

export default Maze;
