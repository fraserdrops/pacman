import React from "react";

const WallInternalStraight = (props) => {
  const { rotation, tileSize, position, className } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M 0,4 H 8" fill="transparent" className={className} />
    </g>
  );
};

export const WallInternalStraightTop = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallInternalStraight
      rotation={0}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallInternalStraightRight = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallInternalStraight
      rotation={90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallInternalStraightBottom = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallInternalStraight
      rotation={180}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallInternalStraightLeft = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallInternalStraight
      rotation={-90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};
