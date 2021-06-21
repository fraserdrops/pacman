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
      transform={`translate(${
        position.col * tileSize + position.colOffset - tileSize / 2
      }
    ${
      position.row * tileSize + position.rowOffset - tileSize / 2 - 1
    }), scale(0.9, 0.9)`}
    >
      <g transform={``}>
        <path
          d="M0, 6 a6,6 0 0 1 12,0 v4 h -12 z"
          fill={color}
          stroke={color}
        />
      </g>
      <g transform={``} className={styles.shapeOne}>
        <path
          d="M12, 10 v1.7 L 10.5 10 L 8.5 12.2 L 7.5 12.2 L 7.5 10.2 L 6 10.2 L 4.5 10.2 L 4.5 12.2 L 3.5 12.2 L 1.5 10 L 0 11.7 L 0 10"
          fill={color}
          stroke={color}
        />
      </g>
      <g className={styles.shapeTwo}>
        <path
          d="M12, 10 v1  L 11 12 L 9.75 11    L 8.5 10 L 7.25 11    L 6 12   L 4.75 11  L 3.5 10   L 2.25 11  L 1 12   L 0, 11 L 0 10"
          fill={color}
          stroke={color}
        />
      </g>
    </g>
  );
});

export default Ghost;
