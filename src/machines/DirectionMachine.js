import { assign, createMachine, sendParent, send } from "xstate";
import { getTileType } from "../shared/maze";
import {
  getProjectedPosition,
  isPositionWithinZone,
} from "../util/characterUtil";
import { tileToString } from "../util/mazeUtil";

let directions = ["up", "left", "down", "right"];

const DirectionMachine = createMachine(
  {
    id: "Direction",
    context: {
      forbiddenZones: {},
      restrictedZones: {},
    },
    on: {
      ADD_FORBIDDEN_ZONE: {
        actions: ["addForbiddenZone"],
      },
      REMOVE_FORBIDDEN_ZONE: {
        actions: ["removeForbiddenZone"],
      },
      ADD_RESTRICTED_DIRECTIONS: {
        actions: ["addRestrictedZone"],
      },
      REMOVE_RESTRICTED_DIRECTIONS: {
        actions: ["removeRestrictedZone"],
      },
      CALCULATE_NEXT_DIRECTION: {
        actions: ["calculateNextDirection"],
      },
      CALCULATE_NEXT_RANDOM_DIRECTION: {
        actions: ["calculateNextRandomDirection"],
      },
    },
  },
  {
    actions: {
      calculateNextDirection: sendParent((ctx, event) => {
        const { maze, position, direction, targetTile } = event;
        const { restrictedZones, forbiddenZones } = ctx;
        const nextDirection = chooseNextDirection({
          maze,
          position,
          direction,
          targetTile,
          restrictedZones,
          forbiddenZones,
        });
        return { type: "UPDATE_NEXT_DIRECTION", nextDirection };
      }),
      calculateNextRandomDirection: sendParent((ctx, event) => {
        const { restrictedZones, forbiddenZones } = ctx;

        const { maze, position, direction } = event;
        const nextDirection = chooseNextRandomDirection({
          maze,
          position,
          direction,
          restrictedZones,
          forbiddenZones,
        });
        return { type: "UPDATE_NEXT_DIRECTION", nextDirection };
      }),
      addForbiddenZone: assign({
        forbiddenZones: (ctx, event) => {
          return {
            ...ctx.forbiddenZones,
            [event.zoneKey]: {
              zone: event.zone,
            },
          };
        },
      }),
      removeForbiddenZone: assign({
        forbiddenZones: (ctx, event) => {
          const newForbiddenZones = { ...ctx.forbiddenZones };
          delete newForbiddenZones[event.zoneKey];
          return newForbiddenZones;
        },
      }),
      addRestrictedZone: assign({
        restrictedZones: (ctx, event) => {
          return {
            ...ctx.restrictedZones,
            [event.zoneKey]: {
              restrictedDirections: event.restrictedDirections,
              zone: event.zone,
            },
          };
        },
      }),
      removeRestrictedZone: assign({
        restrictedTiles: (ctx, event) => {
          const newRestrictedZones = { ...ctx.restrictedZones };
          delete newRestrictedZones[event.zoneKey];
          return newRestrictedZones;
        },
      }),
    },
  }
);

const euclideanDistance = (x1, y1, x2, y2) =>
  Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

function filterReverseDirection(currentDirection, directions) {
  const oppositeDirection = {
    left: "right",
    right: "left",
    up: "down",
    down: "up",
  };

  return directions.filter(
    (direction) => oppositeDirection[currentDirection] !== direction
  );
}

function chooseNextDirection({
  maze,
  position,
  direction,
  targetTile,
  forbiddenZones,
  restrictedZones,
  useCurrentTile,
}) {
  // the ghosts look one tile ahead and choose what direction they will take when they get to the next tile

  let nextDirection = "up";
  let nextPosition = getProjectedPosition(
    maze,
    { direction, row: position.row, col: position.col },
    direction,
    true
  );

  if (useCurrentTile) {
    nextPosition = position;
  }

  let restrictedDirectionsAtNextPosition = [];
  Object.keys(restrictedZones).forEach((zoneKey) => {
    const { zone, restrictedDirections } = restrictedZones[zoneKey];
    if (isPositionWithinZone(nextPosition, zone)) {
      restrictedDirectionsAtNextPosition.push(...restrictedDirections);
    }
  });

  let validDirections = [...directions].filter(
    (direction) => !restrictedDirectionsAtNextPosition.includes(direction)
  );

  validDirections = validDirections.filter((direction) => {
    const projectedPosition = getProjectedPosition(
      maze,
      { row: nextPosition.row, col: nextPosition.col },
      direction,
      true
    );
    const isWall = getTileType(maze.tiles, projectedPosition) === "wall";

    const isRestrictedTile = Object.values(forbiddenZones).some(({ zone }) =>
      isPositionWithinZone(projectedPosition, zone)
    );
    return !isWall && !isRestrictedTile;
  });
  // console.table({
  //   targetTile,
  //   forbiddenZones,
  //   restrictedZones,
  //   position,
  // });
  // disallow reversing, unless reversing is the only option
  if (validDirections.length > 1) {
    validDirections = filterReverseDirection(direction, validDirections);
  }

  if (validDirections.length > 1) {
    // we choose the direction that moves us closer to the target tile
    // need to find the projected position for each valid direction we could choose
    const distanceToTargetIfDirectionChosen = validDirections.map(
      (direction) => {
        const projectedPosition = getProjectedPosition(
          maze,
          { row: nextPosition.row, col: nextPosition.col },
          direction,
          true
        );

        return euclideanDistance(
          projectedPosition.row,
          projectedPosition.col,
          targetTile.row,
          targetTile.col
        );
      }
    );
    let directionsWithShortestDistance = [];
    let shortestDistance = Number.MAX_SAFE_INTEGER;
    distanceToTargetIfDirectionChosen.forEach((distance, index) => {
      if (distance < shortestDistance) {
        directionsWithShortestDistance = [validDirections[index]];
        shortestDistance = distance;
      } else if (distance === shortestDistance) {
        directionsWithShortestDistance.push(validDirections[index]);
      }
    });

    if (directionsWithShortestDistance.length > 1) {
      // go through directions in order of priority (up left down right), and choose the first match
      for (let direction of directions) {
        if (directionsWithShortestDistance.includes(direction)) {
          nextDirection = direction;
          break;
        }
      }
    } else {
      nextDirection = directionsWithShortestDistance[0];
    }
  } else {
    nextDirection = validDirections[0];
  }
  return nextDirection;
}

function chooseNextRandomDirection({
  maze,
  position,
  direction,
  forbiddenZones,
}) {
  // the ghosts look one tile ahead and choose what direction they will take when they get to the next tile

  const nextPosition = getProjectedPosition(
    maze,
    { direction, row: position.row, col: position.col },
    direction,
    true
  );

  let validDirections = [...directions].filter((direction) => {
    const projectedPosition = getProjectedPosition(
      maze,
      { row: nextPosition.row, col: nextPosition.col },
      direction,
      true
    );
    const isWall = getTileType(maze.tiles, projectedPosition) === "wall";
    const isRestrictedTile = Object.values(forbiddenZones).some(({ zone }) =>
      isPositionWithinZone(projectedPosition, zone)
    );
    return !isWall && !isRestrictedTile;
  });

  // disallow reversing, unless reversing is the only option
  if (validDirections.length > 1) {
    validDirections = filterReverseDirection(direction, validDirections);
  }

  const randomDirection =
    validDirections[Math.floor(Math.random() * validDirections.length)];
  return randomDirection;
}

export default DirectionMachine;
