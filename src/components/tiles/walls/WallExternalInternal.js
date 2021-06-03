import React from "react";

const WallExternalInternalRight = (props) => {
  const { rotation, tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path
        d="M 0,0 H 8 M0, 4 a4,4 0 0 1 4,4"
        fill="transparent"
        stroke={color}
      />
    </g>
  );
};

const WallExternalInternalLeft = (props) => {
  const { rotation, tileSize, position, color } = props;
  console.log(tileSize);
  return (
    <g
      transform={`translate(${position.x + tileSize}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2}), scale(-1, 1)`}
    >
      <path
        d="M 0,0 H 8 M0, 4 a4,4 0 0 1 4,4"
        fill="transparent"
        stroke={color}
      />
    </g>
  );
};

export const WallExternalInternalTR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalRight
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalTL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={0}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalLR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalRight
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalLL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={-90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalBR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalRight
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalBL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={180}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalRR = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalRight
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};

export const WallExternalInternalRL = (props) => {
  const { tileSize, color, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={90}
      tileSize={tileSize}
      color={color}
      position={position}
    />
  );
};
