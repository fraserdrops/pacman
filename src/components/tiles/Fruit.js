export const Fruit = (props) => {
  const { tileSize, position, color } = props;

  return (
    <g transform={`translate(${position.x}, ${position.y})`}>
      <circle cx="4" cy="4" r="1" fill="red" />
    </g>
  );
};
