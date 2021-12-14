import React from "react";
import { getTileComponent } from "./tiles/getTileComponent";
import styles from "./Maze.module.css";
import { useSelector } from "@xstate/react";

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

const Tile = React.memo(
  (props) => {
    const { i, j, tileSize, flashing, type, display } = props;
    const TileComponent = getTileComponent(type, display);
    const color = getColorForType(type);
    // console.log("TILE RENDER");
    return (
      <TileComponent
        key={`${i}, ${j}`}
        tileSize={tileSize}
        position={{ x: j * tileSize, y: i * tileSize }}
        color={color}
        className={getClassForType(type, flashing)}
      />
    );
  }
  // (prev, next) => {
  //   // console.log(prev, next);
  //   return true;
  // }
);

const selectMaze = (state) => state.context.maze;
const Maze = React.memo((props) => {
  const { levelActor, tileSize, flashing } = props;
  const maze = useSelector(levelActor, selectMaze, (a, b) => a === b);
  if (!maze) {
    return null;
  }
  const tiles = [];

  maze.tiles.forEach((row, i) => {
    row.forEach((tile, j) => {
      tiles.push(
        <Tile
          key={`${i}, ${j}`}
          i={i}
          j={j}
          type={tile.type}
          display={tile.display}
          tileSize={tileSize}
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
