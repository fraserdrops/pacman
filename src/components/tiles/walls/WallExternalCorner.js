import React from "react";

const WallExternalCorner = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M0, 0 a8,8 0 0 1 8,8" fill="transparent" stroke={color} />
      <path d="M0, 4 a4,4 0 0 1 4,4" fill="transparent" stroke={color} />
    </g>
  );
};

export const WallExternalCornerTR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalCorner
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalCornerTL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalCorner
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalCornerBR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalCorner
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalCornerBL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalCorner
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
