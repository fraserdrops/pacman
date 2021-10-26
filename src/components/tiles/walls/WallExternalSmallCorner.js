import React from "react";

const WallExternalSmallCorner = (props) => {
  const { rotation, tileSize, position, className } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path d="M0, 8, H 1" fill="transparent" className={className} />
      <path d="M0, 4 a4,4 0 0 1 4,4" fill="transparent" className={className} />
    </g>
  );
};

export const WallExternalSmallCornerTR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalSmallCorner
      rotation={0}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalSmallCornerTL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalSmallCorner
      rotation={-90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalSmallCornerBR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalSmallCorner
      rotation={90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalSmallCornerBL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalSmallCorner
      rotation={180}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};
