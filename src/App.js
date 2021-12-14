import { useInterpret, useSelector } from "@xstate/react";
import styles from "./App.module.css";
import Level from "./components/Level";
import GameMachine from "./machines/GameMachine";
import { useEffect } from "react";
import GameCompleted from "./components/GameCompleted";

const selectLevel = (state) => state.context.currentLevel;
const selectReadyToPlay = (state) => state.hasTag("readyToPlay");
const selectPlayingLevel = (state) => state.hasTag("playingLevel");
const selectGameCompleted = (state) => state.hasTag("gameCompleted");

function App() {
  const game = useInterpret(GameMachine, { devTools: "true" });
  const level = useSelector(game, selectLevel);
  const readyToPlay = useSelector(game, selectReadyToPlay);
  const playingLevel = useSelector(game, selectPlayingLevel);
  const gameCompleted = useSelector(game, selectGameCompleted);

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        game.send("UP_ARROW");
      }

      if (e.key === "ArrowDown") {
        game.send("DOWN_ARROW");
      }

      if (e.key === "ArrowLeft") {
        game.send("LEFT_ARROW");
      }

      if (e.key === "ArrowRight") {
        game.send("RIGHT_ARROW");
      }
    });
  }, [game]);
  return (
    <div className={styles.App}>
      {readyToPlay && (
        <button onClick={() => game.send("PLAY_GAME")}>Play</button>
      )}
      {/* {playingLevel && <Level levelActor={level} />} */}
      {gameCompleted && <GameCompleted />}
    </div>
  );
}

export default App;
