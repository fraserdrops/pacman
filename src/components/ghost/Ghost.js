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
    <>
      <g
        transform={`translate(${
          position.col * tileSize + position.colOffset - 4.8
        }
    ${position.row * tileSize + position.rowOffset - 6})`}
      >
        {state.hasTag("regular") && (
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
      <g
        transform={`translate(${position.col * tileSize}
    ${position.row * tileSize})`}
      >
        <rect width="8" height="8" stroke="white" strokeWidth="1" fill="none" />
      </g>
      <g
        transform={`translate(${
          position.col * tileSize + position.colOffset - 0.5
        }
    ${position.row * tileSize + position.rowOffset - 0.5})`}
      >
        <circle r="1" cx="0" cy="0" fill="yellow" />
      </g>
    </>
  );
});

export default Ghost;
