import React from "react";

const WallExternalStraight = (props) => {
  const { rotation, tileSize, position, className } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      {/* <rect width="8" height="8" stroke="white" strokeWidth="1" /> */}
      <path d="M 0,0 H 8 M 0,4 H 8" fill="transparent" className={className} />
    </g>
  );
};

export const WallExternalStraightTop = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalStraight
      rotation={0}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalStraightRight = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalStraight
      rotation={90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalStraightBottom = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalStraight
      rotation={180}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalStraightLeft = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalStraight
      rotation={-90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};
