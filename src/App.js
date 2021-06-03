import logo from "./logo.svg";
import "./App.css";
import { useInterpret, useMachine } from "@xstate/react";
import GameMachine from "./machines/GameMachine";

import { inspect } from "@xstate/inspect";
import Maze from "./components/Maze";

inspect({
  // url: "https://actorviz.fraser.space",
  url: "https://statecharts.io/inspect",
  iframe: false,
});

function App() {
  const [state] = useMachine(GameMachine, { devTools: true });
  return (
    <div className="App">
      <Maze />
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
