import { useActor, useInterpret, useSelector } from "@xstate/react";
import React from "react";
import DeadGhost from "./DeadGhost";
import FrightEndingGhost from "./FrightEndingGhost";
import FrightStartedGhost from "./FrightStartedGhost";
import HiddenGhost from "./HiddenGhost";
import NormalGhost from "./NormalGhost";
import ReturningHomeGhost from "./ReturningHomeGhost";

const ghostColors = {
  inky: "cyan",
  pinky: "pink",
  blinky: "red",
  clyde: "orange",
};

const selectGhost = (state) => state.children.ghost;
const selectPosition = (state) => state.context.position;
const selectDirection = (state) => state.context.direction;
const GhostWrapper = React.memo((props) => {
  const { tileSize, actorRef } = props;
  // const [state, send] = useActor(actorRef);
  // const ghostWrapper = use(actorRef);
  // console.log("ghostWrapper", ghostWrapper);

  const ghost = useSelector(actorRef, selectGhost, (a, b) => a === b);
  const ghostRef = ghost || actorRef;
  return <>{ghostRef && <Ghost tileSize={tileSize} actorRef={ghostRef} />}</>;
});
const Ghost = React.memo((props) => {
  const { tileSize, actorRef } = props;

  // const position = useSelector(actorRef, selectPosition, (a, b) => a === b);
  // const direction = useSelector(actorRef, selectDirection, (a, b) => a === b);
  const [state, send] = useActor(actorRef);
  const { position, direction, character } = state.context;
  const color = ghostColors[character];
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
    </>
  );
});

export default GhostWrapper;
