import React from "react";

const Ghost = React.memo((props) => {
  const { tileSize } = props;

  return (
    <text
      y={tileSize}
      textAnchor="center"
      color="#00F5F6"
      stroke="#00F5F6"
      style={{ color: "#00F5F6", fontSize: 10, fontWeight: 200 }}
    >
      200
    </text>
  );
});

export default Ghost;
