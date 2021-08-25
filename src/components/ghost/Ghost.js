import { useActor } from "@xstate/react";
import React from "react";
import DeadGhost from "./DeadGhost";
import FrightEndingGhost from "./FrightEndingGhost";
import FrightStartedGhost from "./FrightStartedGhost";
import HiddenGhost from "./HiddenGhost";
import NormalGhost from "./NormalGhost";
import ReturningHomeGhost from "./ReturningHomeGhost";

const Ghost = React.memo((props) => {
  const { tileSize, actorRef, color } = props;
  const [state, send] = useActor(actorRef);
  const { position, direction } = state.context;
  if (!position) {
    return null;
  }

  return (
    <g
      transform={`translate(${
        position.col * tileSize + position.colOffset - tileSize / 2
      }
    ${
      position.row * tileSize + position.rowOffset - tileSize / 2 - 1
    }), scale(0.9, 0.9)`}
    >
      {(state.hasTag("normal") ||
        state.hasTag("ready") ||
        state.hasTag("atHome") ||
        state.hasTag("init") ||
        state.hasTag("leavingHome")) && (
        <NormalGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
          paused={state.hasTag("movementPaused")}
        />
      )}
      {state.hasTag("frightStarted") && (
        <FrightStartedGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
          paused={state.hasTag("movementPaused")}
        />
      )}
      {state.hasTag("frightEnding") && (
        <FrightEndingGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
          paused={state.hasTag("movementPaused")}
        />
      )}
      {state.hasTag("hidden") && (
        <HiddenGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
        />
      )}
      {state.hasTag("dead") && (
        <DeadGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
        />
      )}
      {state.hasTag("returningHome") && (
        <ReturningHomeGhost
          color={color}
          position={position}
          direction={direction}
          tileSize={tileSize}
        />
      )}
    </g>
  );
});

export default Ghost;
