import { useActor, useSelector } from "@xstate/react";
import React from "react";
import { interpret } from "xstate";
import styles from "./Ghost.module.css";

const makeSquiggle = (
  startX,
  startY,
  length,
  squiggleStep,
  squiggleAmplitude
) => {
  // Adjust step so that there are a whole number of steps along the path
  let lengthStep = length / squiggleStep;
  let pos = { x: startX, y: startY };

  let newPath = "M" + [pos.x, pos.y + 0.5].join(",");
  let side = -1;
  for (let i = 1; i <= squiggleStep; i++) {
    let last = pos;
    pos = { x: startX + lengthStep * i, y: startY };

    // Find a point halfway between last and pos. Then find the point that is
    // perpendicular to that line segment, and is squiggleAmplitude away from
    // it on the side of the line designated by 'side' (-1 or +1).
    // This point will be the control point of the quadratic curve forming the
    // squiggle step.

    // The vector from the last point to this one
    let vector = { x: pos.x - last.x, y: pos.y - last.y };
    // The length of this vector
    let vectorLen = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    // The point halfwasy between last point and tis one
    let half = { x: last.x + vector.x / 2, y: last.y + vector.y / 2 };
    // The vector that is perpendicular to 'vector'
    let perpVector = {
      x: -((squiggleAmplitude * vector.y) / vectorLen),
      y: (squiggleAmplitude * vector.x) / vectorLen,
    };
    // No calculate the control point position
    let controlPoint = {
      x: half.x + perpVector.x * side,
      y: half.y + perpVector.y * side,
    };

    if (i === squiggleStep) {
      pos.y += 0.5;
    }

    newPath += "Q" + [controlPoint.x, controlPoint.y, pos.x, pos.y].join(",");
    // Switch the side (for next step)
    side = -side;
  }
  return newPath;
};

const mapDirectionToEyePosition = {
  right: {
    leftEye: {
      x: 4,
      y: 5,
    },
    rightEye: {
      x: 10,
      y: 5,
    },
    pupilOffset: {
      x: 0.5,
      y: 0,
    },
  },
  down: {
    leftEye: {
      x: 3,
      y: 5,
    },
    rightEye: {
      x: 9,
      y: 5,
    },
    pupilOffset: {
      x: 0,
      y: 1,
    },
  },
  left: {
    leftEye: {
      x: 2,
      y: 5,
    },
    rightEye: {
      x: 8,
      y: 5,
    },
    pupilOffset: {
      x: -0.5,
      y: 0,
    },
  },
  up: {
    leftEye: {
      x: 3,
      y: 3,
    },
    rightEye: {
      x: 9,
      y: 3,
    },
    pupilOffset: {
      x: 0,
      y: -1,
    },
  },
};

const selectGhost = (state) => state.children.ghost;

const Ghost = React.memo((props) => {
  const { tileSize, actorRef, color } = props;
  const ghostWrapper = interpret(actorRef);
  const ghost = useSelector(ghostWrapper, selectGhost, (a, b) => a === b);
  console.log("GHOST", ghostWrapper, ghost);
  const [state, send] = useActor(ghost);

  const { position, direction } = state.context;
  if (!position) {
    return null;
  }
  const frightColor = "#2020F7";
  let ghostColor = state.hasTag("frightened") ? frightColor : color;

  if (state.hasTag("hidden")) {
    return null;
  }

  const { leftEye, rightEye, pupilOffset } =
    mapDirectionToEyePosition[direction];
  return (
    <g
      transform={`translate(${
        position.col * tileSize + position.colOffset - tileSize / 2
      }
    ${
      position.row * tileSize + position.rowOffset - tileSize / 2 - 1
    }), scale(0.9, 0.9)`}
    >
      {(state.hasTag("frightened") || state.hasTag("normal")) && (
        <g>
          <g>
            <path
              d="M0, 6 a6,6 0 0 1 12,0 v4 h -12 z"
              fill={ghostColor}
              stroke={ghostColor}
            />
          </g>
          <g className={styles.shapeOne}>
            <path
              d="M12, 10 v1.7 L 10.5 10 L 8.5 12.2 L 7.5 12.2 L 7.5 10.2 L 6 10.2 L 4.5 10.2 L 4.5 12.2 L 3.5 12.2 L 1.5 10 L 0 11.7 L 0 10"
              fill={ghostColor}
              stroke={ghostColor}
            />
          </g>
          <g className={styles.shapeTwo}>
            <path
              d="M12, 10 v1  L 11 12 L 9.75 11    L 8.5 10 L 7.25 11    L 6 12   L 4.75 11  L 3.5 10   L 2.25 11  L 1 12   L 0, 11 L 0 10"
              fill={ghostColor}
              stroke={ghostColor}
            />
          </g>
          {!state.hasTag("frightened") && (
            <g>
              <g transform={`translate(${leftEye.x}, ${leftEye.y})`}>
                <ellipse rx="1.5" ry="2" fill="white" />
                <circle
                  cx={pupilOffset.x}
                  cy={pupilOffset.y}
                  r="1"
                  fill="blue"
                />
              </g>
              <g transform={`translate(${rightEye.x}, ${rightEye.y})`}>
                <ellipse rx="1.5" ry="2" fill="white" />
                <circle
                  cx={pupilOffset.x}
                  cy={pupilOffset.y}
                  r="1"
                  fill="blue"
                />
              </g>
            </g>
          )}
          {state.hasTag("frightened") && (
            <g>
              <g transform={`translate(4, 5)`}>
                <ellipse rx="1" ry="1" fill="white" />
              </g>
              <g transform={`translate(8, 5)`}>
                <ellipse rx="1" ry="1" fill="white" />
              </g>
              <path d={makeSquiggle(2, 8.5, 8, 5, 1)} stroke="white" />
            </g>
          )}

          {state.hasTag("frightEnding") && (
            <g>
              <g transform={`translate(4, 5)`}>
                <ellipse rx="1" ry="1" fill="white" />
              </g>
              <g transform={`translate(8, 5)`}>
                <ellipse rx="1" ry="1" fill="white" />
              </g>
              <path d={makeSquiggle(2, 8.5, 8, 5, 1)} stroke="white" />
            </g>
          )}
        </g>
      )}
      {state.hasTag("dead") && (
        <text
          y={tileSize}
          textAnchor="center"
          color="#00F5F6"
          stroke="#00F5F6"
          style={{ color: "#00F5F6", fontSize: 10, fontWeight: 200 }}
        >
          200
        </text>
      )}
      {state.hasTag("returningHome") && (
        <g>
          <g transform={`translate(${leftEye.x}, ${leftEye.y})`}>
            <ellipse rx="1.5" ry="2" fill="white" />
            <circle cx={pupilOffset.x} cy={pupilOffset.y} r="1" fill="blue" />
          </g>
          <g transform={`translate(${rightEye.x}, ${rightEye.y})`}>
            <ellipse rx="1.5" ry="2" fill="white" />
            <circle cx={pupilOffset.x} cy={pupilOffset.y} r="1" fill="blue" />
          </g>
        </g>
      )}
    </g>
  );
});

export default Ghost;
