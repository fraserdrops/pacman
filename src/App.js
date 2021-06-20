import { useInterpret, useSelector } from "@xstate/react";
import { useEffect } from "react";
import "./App.css";
import Maze from "./components/Maze";
import Pacman from "./components/Pacman";
import Ghost from "./components/Ghost";
import GameMachine from "./machines/GameMachine";

// inspect({
//   // url: "https://actorviz.fraser.space",
//   url: "https://statecharts.io/inspect",
//   iframe: false,
// });

const ghostColors = {
  inky: "cyan",
  pinky: "pink",
  blinky: "red",
  clyde: "orange",
};

const tileSize = 8;

const selectPacman = (state) => state.context.pacman;
const selectPosition = (state) => state.context.pacman.position;
const selectGhosts = (state) => state.context.ghosts;
const selectMaze = (state) => state.context.maze;

const compare = (prev, next) => {
  console.log(prev, next, prev === next);
  return prev === next;
};
function App() {
  // const [state, send] = useMachine(GameMachine, { devTools: true });
  const service = useInterpret(GameMachine);
  const pacman = useSelector(service, selectPacman);
  // const pacman = useInterpret(testPacman);
  const ghosts = useSelector(service, selectGhosts);
  const maze = useSelector(service, selectMaze);
  // console.log(pacman.position);
  console.log("yoza");

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        service.send("UP_ARROW");
      }

      if (e.key === "ArrowDown") {
        service.send("DOWN_ARROW");
      }

      if (e.key === "ArrowLeft") {
        service.send("LEFT_ARROW");
      }

      if (e.key === "ArrowRight") {
        service.send("RIGHT_ARROW");
      }
    });
  }, []);
  return (
    <div className="App">
      <svg
        width="700px"
        height="70vh"
        viewBox="0 0 300 300"
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            service.send("UP_ARROW");
          }

          if (e.key === "ArrowDown") {
            service.send("DOWN_ARROW");
          }

          if (e.key === "ArrowLeft") {
            service.send("Left_ARROW");
          }

          if (e.key === "ArrowRight") {
            service.send("Right_ARROW");
          }
        }}
      >
        <Maze maze={maze} />

        <Pacman actorRef={pacman.ref} tileSize={tileSize} />
        {Object.keys(ghosts).map((ghostId) => {
          return (
            <Ghost
              actorRef={ghosts[ghostId].ref}
              tileSize={tileSize}
              color={ghostColors[ghostId]}
            />
          );
        })}
      </svg>
      {/* <p>Game State: {JSON.stringify(state.value)}</p> */}
      <div>
        {/* <p>Direction: {pacman.direction}</p>
        <p>Requested Direction: {pacman.requestedDirection}</p>
        <p>
          Col: {pacman.position?.col}, colOffset: {pacman.position?.colOffset},
          row: {pacman.position?.row}, rowOffset: {pacman.position?.rowOffset}
        </p> */}
      </div>
      {/* <div style={{ fontSize: "14" }}>
        <p>Direction: {ghosts.inky.direction}</p>
        <p>Requested Direction: {ghosts.inky.nextDirection}</p>
        <p>
          Col: {ghosts.inky.position?.col}, colOffset:{" "}
          {ghosts.inky.position?.colOffset}, row: {ghosts.inky.position?.row},
          rowOffset: {ghosts.inky.position?.rowOffset}
        </p>
      </div> */}
    </div>
  );
}

export default App;
