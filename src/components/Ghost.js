import { useActor } from "@xstate/react";
import React from "react";
import styles from "./Ghost.module.css";

const selectPosition = (state) => {
  console.log(state);
  return state.context.position;
};
const selectContext = (state) => state.context;
const selectDirection = (state) => state.context.direction;
const compare = (prev, next) => {
  console.log(prev, next, prev === next);
  return false;
};

const mapDirectionToRotation = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};
const Ghost = React.memo((props) => {
  const { tileSize, actorRef, color } = props;
  const [state, send] = useActor(actorRef);
  const { position, direction } = state.context;
  if (!position) {
    return null;
  }

  const showEating = state.hasTag("moving") && !state.hasTag("walled");
  const showDying = state.hasTag("dying");

  let radius = 4;
  const cx = radius * 2;
  const cy = cx;
  const strokeWidth = radius * 2;
  let topGapAngle = 20;
  let bottomGapAngle = 20;
  const circumference = Math.PI * 2 * radius;

  let topClass = styles.mouthTop;
  let bottomClass = styles.m;
  if (showEating) {
    topClass = styles.mouthTop;
    bottomClass = styles.mouthBottom;
  } else if (showDying) {
    topClass = styles.mouthTopDying;
    bottomClass = styles.mouthBottomDying;
  }

  if (state.hasTag("hidden")) {
    return null;
  }
  return (
    <g
      transform={`translate(${position.col * tileSize + position.colOffset}
    ${position.row * tileSize + position.rowOffset}) rotate(${
        mapDirectionToRotation[direction]
      })`}
    >
      <g transform={`rotate(180 0 0) `}>
        <circle
          r="4"
          cx="0"
          cy="0"
          stroke={color}
          fill="transparent"
          stroke-width="8"
          stroke-dasharray={`${
            ((50 - (topGapAngle / 360) * 100) * circumference) / 100
          } ${circumference}`}
        />
      </g>
      <g transform="rotate(-180 0 0), scale(1, -1) ,translate(0, 0)">
        <circle
          r="4"
          cx="0"
          cy="0"
          stroke={color}
          fill="transparent"
          stroke-width="8"
          stroke-dasharray={`${
            ((50 - (bottomGapAngle / 360) * 100) * circumference) / 100
          } ${circumference}`}
        />
      </g>
    </g>
  );
});

export default Ghost;