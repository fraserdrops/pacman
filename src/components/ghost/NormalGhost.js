import React from "react";
import styles from "./Ghost.module.css";
import { getEyePositionFromDirection } from "./util";

const NormalGhost = React.memo((props) => {
  const { direction, color } = props;
  let ghostColor = color;

  const { leftEye, rightEye, pupilOffset } =
    getEyePositionFromDirection(direction);
  return (
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
    </g>
  );
});

export default NormalGhost;
