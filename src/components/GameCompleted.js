import styles from "./GameCompleted.module.css";

function GameCompleted() {
  return (
    <div className={styles.gameCompleted}>
      <h2 style={{ margin: 0 }}>WINNER!</h2>
    </div>
  );
}

export default GameCompleted;
