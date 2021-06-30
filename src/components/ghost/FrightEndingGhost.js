import React from "react";
import styles from "./Ghost.module.css";
import frightEndingStyles from "./FrightEndingGhost.module.css";
import { makeSquiggle } from "./util";

const FrightEndingGhost = React.memo((props) => {
  return (
    <g>
      <g className={frightEndingStyles.ghostBody}>
        <g>
          <path d="M0, 6 a6,6 0 0 1 12,0 v4 h -12 z" />
        </g>
        <g className={styles.shapeOne}>
          <path d="M12, 10 v1.7 L 10.5 10 L 8.5 12.2 L 7.5 12.2 L 7.5 10.2 L 6 10.2 L 4.5 10.2 L 4.5 12.2 L 3.5 12.2 L 1.5 10 L 0 11.7 L 0 10" />
        </g>
        <g className={styles.shapeTwo}>
          <path d="M12, 10 v1  L 11 12 L 9.75 11    L 8.5 10 L 7.25 11    L 6 12   L 4.75 11  L 3.5 10   L 2.25 11  L 1 12   L 0, 11 L 0 10" />
        </g>
      </g>

      <g className={frightEndingStyles.ghostFace}>
        <g transform={`translate(4, 5)`}>
          <ellipse rx="1" ry="1" />
        </g>
        <g transform={`translate(8, 5)`}>
          <ellipse rx="1" ry="1" />
        </g>
        <path d={makeSquiggle(2, 8.5, 8, 5, 1)} />
      </g>
    </g>
  );
});

export default FrightEndingGhost;
