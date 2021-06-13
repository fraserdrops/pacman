import logo from "./logo.svg";
import "./App.css";
import { useInterpret, useMachine } from "@xstate/react";
import GameMachine from "./machines/GameMachine";

import { inspect } from "@xstate/inspect";
import Maze from "./components/Maze";
import { useEffect } from "react";

// inspect({
//   // url: "https://actorviz.fraser.space",
//   url: "https://statecharts.io/inspect",
//   iframe: false,
// });

function App() {
  const [state, send] = useMachine(GameMachine, { devTools: true });
  const { pacman, ghosts, maze } = state.context;

  const tileSize = 8;
  const { position, direction } = pacman;

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      console.log("arrow", e.key);
      if (e.key === "ArrowUp") {
        send("UP_ARROW");
      }

      if (e.key === "ArrowDown") {
        send("DOWN_ARROW");
      }

      if (e.key === "ArrowLeft") {
        send("LEFT_ARROW");
      }

      if (e.key === "ArrowRight") {
        send("RIGHT_ARROW");
      }
    });
  }, []);
  return (
    <div className="App">
      <svg
        width="500px"
        height="50vh"
        onKeyDown={(e) => {
          console.log("arrow", e.key);
          if (e.key === "ArrowUp") {
            send("UP_ARROW");
          }

          if (e.key === "ArrowDown") {
            send("DOWN_ARROW");
          }

          if (e.key === "ArrowLeft") {
            send("Left_ARROW");
          }

          if (e.key === "ArrowRight") {
            send("Right_ARROW");
          }
        }}
      >
        {position && (
          <circle
            r="8"
            cx={position.col * tileSize + position.colOffset}
            cy={position.row * tileSize + position.rowOffset}
            fill="red"
          ></circle>
        )}
        {Object.keys(ghosts).map((ghostId) => {
          const ghost = ghosts[ghostId];
          const { position, direction } = ghost;
          if (!position) {
            return undefined;
          }
          return (
            <circle
              r="8"
              cx={position.col * tileSize + position.colOffset}
              cy={position.row * tileSize + position.rowOffset}
              fill="blue"
            ></circle>
          );
        })}
        <Maze maze={maze} />
      </svg>
      <p>Game State: {JSON.stringify(state.value)}</p>
      <p>Direction: {pacman.direction}</p>
      <p>Requested Direction: {pacman.requestedDirection}</p>
      <p>
        Col: {pacman.position?.col}, colOffset: {pacman.position?.colOffset}
      </p>
      <p>
        Col: {pacman.position?.row}, rowOffset: {pacman.position?.rowOffset}
      </p>
    </div>
  );
}

export default App;
