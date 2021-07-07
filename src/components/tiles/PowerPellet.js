import styles from "./PowerPellet.module.css";

export const PowerPellet = (props) => {
  const { tileSize, position, color } = props;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className={styles.powerPellet}
    >
      <circle cx="4" cy="4" r="4" fill={color} />
    </g>
  );
};
