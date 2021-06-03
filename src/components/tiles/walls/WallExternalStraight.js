import React from "react";

const WallExternalStraight = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M 0,0 H 8 M 0,4 H 8" fill="transparent" stroke={color} />
    </g>
  );
};

export const WallExternalStraightTop = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalStraight
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalStraightRight = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalStraight
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalStraightBottom = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalStraight
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalStraightLeft = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalStraight
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
