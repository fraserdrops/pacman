export const HouseEntrance = (props) => {
  const { tileSize, position, color } = props;

  return (
    <g transform={`translate(${position.x}, ${position.y})`}>
      <path d="M 0,6 H 8" fill="transparent" stroke={color} strokeWidth={2} />
    </g>
  );
};
