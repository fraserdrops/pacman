import React from "react";

const WallHouseCorner = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path
        d="M 4,4 H 9 M 4,4 V 9 M8,8, H9 "
        fill="transparent"
        stroke={color}
      />
    </g>
  );
};

export const WallHouseCornerTL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallHouseCorner
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallHouseCornerTR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallHouseCorner
      rotation={9090}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallHouseCornerBR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallHouseCorner
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallHouseCornerBL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallHouseCorner
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
