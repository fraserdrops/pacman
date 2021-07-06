import { useActor } from "@xstate/react";
import React from "react";
import styles from "./Pacman.module.css";
import { Howl, Howler } from "howler";

const selectPosition = (state) => {
  return state.context.position;
};
const selectContext = (state) => state.context;
const selectDirection = (state) => state.context.direction;
const compare = (prev, next) => {
  return false;
};

const pacmanMouthAngles = [];
let min = 0;
let max = 15;

const mapDirectionToRotation = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};
const Pacman = React.memo((props) => {
  const { tileSize, actorRef } = props;
  const [state, send] = useActor(actorRef);
  const { position, direction } = state.context;
  if (!position) {
    return null;
  }

  if (state.hasTag("frightPaused")) {
    return null;
  }

  const showEating = state.hasTag("playing") && !state.hasTag("walled");
  const showDying = state.hasTag("dying");

  let radius = 4;
  const cx = radius * 2;
  const cy = cx;
  const strokeWidth = radius * 2;
  let topGapAngle = 20;
  let bottomGapAngle = 20;
  const circumference = Math.PI * 2 * radius;
  let topClass;
  let bottomClass;
  if (showEating) {
    topClass = styles.mouthTop;
    bottomClass = styles.mouthBottom;
  } else if (showDying) {
    topClass = styles.mouthTopDying;
    bottomClass = styles.mouthBottomDying;
  }
  return (
    <g
      transform={`translate(${position.col * tileSize + position.colOffset + 1}
    ${position.row * tileSize + position.rowOffset}) rotate(${
        mapDirectionToRotation[direction]
      }) scale (0.75 0.75)`}
    >
      <g transform={`rotate(180 0 0) `}>
        <circle
          className={topClass}
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
          className={bottomClass}
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
});

export default Pacman;
