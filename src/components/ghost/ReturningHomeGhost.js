import React from "react";
import { getEyePositionFromDirection } from "./util";

const Ghost = React.memo((props) => {
  const { direction } = props;

  const { leftEye, rightEye, pupilOffset } =
    getEyePositionFromDirection(direction);
  return (
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
  );
});

export default Ghost;
