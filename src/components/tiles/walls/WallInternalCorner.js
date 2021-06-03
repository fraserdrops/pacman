import React from "react";

const WallInternalCorner = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M0, 4 a4,4 0 0 1 4,4" fill="transparent" stroke={color} />
    </g>
  );
};

export const WallInternalCornerTR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalCorner
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalCornerTL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalCorner
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalCornerBR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalCorner
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallInternalCornerBL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallInternalCorner
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
