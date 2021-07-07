import { useActor } from "@xstate/react";
import React from "react";

export const Fruit = React.memo((props) => {
  const { tileSize, actorRef } = props;
  const [state, send] = useActor(actorRef);
  const { type, value, position } = state.context;

  if (state.hasTag("eaten")) {
    return (
      <g
        transform={`translate(${position.col * tileSize}, ${
          position.row * tileSize
        })`}
      >
        <text
          y={tileSize}
          textAnchor="center"
          color="#00F5F6"
          stroke="#00F5F6"
          style={{ color: "#00F5F6", fontSize: 10, fontWeight: 200 }}
        >
          {value}
        </text>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${position.col * tileSize}, ${
        position.row * tileSize - 3
      })`}
    >
      <g transform="scale(0.05, 0.05)">
        <path
          d="M 168 42 C 168 21 231 21 210 21 C 195.5 31.5 231 21 231 42 C 168 42 273 63 189 84 C 153.5 63 210 63 168 42"
          fill="green"
        />
      </g>
      <circle r="5" cx="8" cy="8" fill="orange" />
      <g transform="scale(0.08, 0.08), translate(-75, -30)">
        <path
          d="M 180 40 C 180 50 180 60 170 80 L 180 90 L 190 80 Q 180 70 180 40 "
          fill="#B0742F"
        />
      </g>
      <g />
    </g>
  );
});
