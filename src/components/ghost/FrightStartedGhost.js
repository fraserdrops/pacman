import React from "react";
import styles from "./Ghost.module.css";
import { makeSquiggle } from "./util";

const FrightStartedGhost = React.memo((props) => {
  const frightColor = "#2020F7";
  let ghostColor = frightColor;

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
        <g transform={`translate(4, 5)`}>
          <ellipse rx="1" ry="1" fill="white" />
        </g>
        <g transform={`translate(8, 5)`}>
          <ellipse rx="1" ry="1" fill="white" />
        </g>
        <path d={makeSquiggle(2, 8.5, 8, 5, 1)} stroke="white" />
      </g>
    </g>
  );
});

export default FrightStartedGhost;
