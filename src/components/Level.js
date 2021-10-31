import { useSelector } from "@xstate/react";
import styles from "../App.module.css";
import { Fruit } from "./Fruit";
import Ghost from "./ghost/Ghost";
import Maze from "./Maze";
import Pacman from "./Pacman";

const ghostColors = {
  inky: "cyan",
  pinky: "pink",
  blinky: "red",
  clyde: "orange",
};

const tileSize = 8;

const PacmanIcon = (props) => {
  const { x, y } = props;
  let radius = 4;
  const cx = radius * 2;
  const cy = cx;
  const strokeWidth = radius * 2;
  let topGapAngle = 40;
  let bottomGapAngle = 40;
  const circumference = Math.PI * 2 * radius;
  return (
    <g
      transform={`translate(${x}
${y}) rotate(${180}) scale (0.6 0.6)`}
    >
      <g transform={`rotate(180 0 0) `}>
        <circle
          // className={topClass}
          r="4"
          cx="0"
          cy="-0.2"
          stroke="gold"
          fill="transparent"
          stroke-width="8"
          stroke-dasharray={`${
            ((50 - (topGapAngle / 360) * 100) * circumference) / 100
          } ${circumference}`}
        />
      </g>
      <g transform="rotate(-180 0 0), scale(1, -1) ,translate(0, 0)">
        <circle
          // className={bottomClass}
          r="4"
          cx="0"
          cy="-0.2"
          stroke="gold"
          fill="transparent"
          stroke-width="8"
          stroke-dasharray={`${
            ((50 - (bottomGapAngle / 360) * 100) * circumference) / 100
          } ${circumference}`}
        />
      </g>
    </g>
  );
};

const selectPacman = (state) => state.context.pacman;
const selectGhosts = (state) => {
  return state.context.ghosts;
};
const selectPoints = (state) => state.context.totalPoints;
const selectFruit = (state) => state.context.fruit;
const selectMaze = (state) => state.context.maze;
const selectGetReady = (state) => state.hasTag("getReady");
const selectGameOver = (state) => state.hasTag("gameOver");
const selectMazeFlashing = (state) => state.hasTag("mazeFlashing");
const selectLevelFadeOut = (state) => state.hasTag("levelFadeOut");
const selectLivesRemaining = (state) => state.context.livesRemaining;

function Level(props) {
  const { levelActor } = props;
  const pacman = useSelector(levelActor, selectPacman, (a, b) => a === b);
  const ghosts = useSelector(levelActor, selectGhosts, (a, b) => a === b);
  const maze = useSelector(levelActor, selectMaze, (a, b) => a === b);
  const points = useSelector(levelActor, selectPoints, (a, b) => a === b);
  const fruit = useSelector(levelActor, selectFruit, (a, b) => a === b);
  const getReady = useSelector(levelActor, selectGetReady, (a, b) => a === b);
  const gameOver = useSelector(levelActor, selectGameOver, (a, b) => a === b);
  const levelFadeOut = useSelector(
    levelActor,
    selectLevelFadeOut,
    (a, b) => a === b
  );
  const mazeFlashing = useSelector(
    levelActor,
    selectMazeFlashing,
    (a, b) => a === b
  );
  const livesRemaining = useSelector(
    levelActor,
    selectLivesRemaining,
    (a, b) => a === b
  );

  return (
    <svg
      width="800px"
      height="90vh"
      viewBox="0 0 300 300"
      className={levelFadeOut ? styles.levelFadeOut : ""}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          levelActor.send("UP_ARROW");
        }

        if (e.key === "ArrowDown") {
          levelActor.send("DOWN_ARROW");
        }

        if (e.key === "ArrowLeft") {
          levelActor.send("Left_ARROW");
        }

        if (e.key === "ArrowRight") {
          levelActor.send("Right_ARROW");
        }
      }}
    >
      <Maze maze={maze} tileSize={tileSize} flashing={mazeFlashing} />
      {fruit && <Fruit actorRef={fruit.ref} tileSize={tileSize} />}
      <Pacman actorRef={pacman.ref} tileSize={tileSize} />
      {Object.keys(ghosts).map((ghostId) => {
        if (!ghostId) return null;
        return (
          <Ghost
            actorRef={ghosts[ghostId].ref}
            tileSize={tileSize}
            color={ghostColors[ghostId]}
          />
        );
      })}
      <text
        className={styles.playerUpText}
        x={tileSize * 0 + tileSize / 2}
        y={tileSize * 1}
        stroke="white"
        style={{ fontSize: 8 }}
      >
        1UP
      </text>
      <text
        x={tileSize * 0 + tileSize / 2}
        y={tileSize * 2 + tileSize / 2}
        stroke="white"
        style={{ fontSize: 8 }}
      >
        {points}
      </text>
      {getReady && (
        <text
          x={tileSize * 12 + tileSize / 2}
          y={tileSize * 20 + tileSize / 2 + 3}
          stroke="white"
          style={{ fontSize: 8 }}
        >
          READY!
        </text>
      )}
      {gameOver && (
        <text
          x={tileSize * 11}
          y={tileSize * 20 + tileSize / 2 + 3}
          stroke="red"
          style={{ fontSize: 10 }}
        >
          Game Over
        </text>
      )}
      {new Array(Math.max(livesRemaining - 1, 0)).fill(0).map((val, index) => (
        <PacmanIcon x={tileSize * (1 + 1.5 * index)} y={tileSize * 35} />
      ))}
    </svg>
  );
}

export default Level;
