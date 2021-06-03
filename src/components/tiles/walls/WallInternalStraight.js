import React from "react";

const WallInternalStraight = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M 0,4 H 8" fill="transparent" stroke={color} />
    </g>
  );
};

export const WallInternalStraightTop = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalStraight
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalStraightRight = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalStraight
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalStraightBottom = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalStraight
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalStraightLeft = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalStraight
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
