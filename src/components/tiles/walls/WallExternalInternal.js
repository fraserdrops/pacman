import React from "react";

const WallExternalInternalRight = (props) => {
  const { rotation, tileSize, position, className } = props;

  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path
        d="M 0,0 H 8 M0, 4 a4,4 0 0 1 4,4"
        fill="transparent"
        className={className}
      />
    </g>
  );
};

const WallExternalInternalLeft = (props) => {
  const { rotation, tileSize, position, className } = props;
  return (
    <g
      transform={`translate(${position.x}, ${
        position.y
      }), rotate(${rotation}, ${tileSize / 2}, ${tileSize / 2})`}
    >
      <path
        d="M 0,0 H 8 M8, 4 a4,4 0 0 0 -4,4"
        fill="transparent"
        className={className}
      />
    </g>
  );
};

export const WallExternalInternalTR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalRight
      rotation={0}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalTL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={0}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalLR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalRight
      rotation={-90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalLL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={-90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalBR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalRight
      rotation={180}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalBL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={180}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalRR = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalRight
      rotation={90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};

export const WallExternalInternalRL = (props) => {
  const { tileSize, className, position } = props;
  return (
    <WallExternalInternalLeft
      rotation={90}
      tileSize={tileSize}
      className={className}
      position={position}
    />
  );
};
