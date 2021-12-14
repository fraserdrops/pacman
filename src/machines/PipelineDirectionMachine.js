import { assign, createMachine, sendParent, send } from "xstate";
import { getTileType } from "../shared/maze";
import {
  getProjectedPosition,
  isPositionWithinZone,
} from "../util/characterUtil";

let directions = ["up", "left", "down", "right"];

const DirectionMachine = createMachine(
  {
    id: "Direction",
    context: {
      restrictedTiles: {},
      restrictedZones: {},
      directionRequest: {},
    },
    on: {
      ADD_FORBIDDEN_ZONE: {
        actions: ["addRestrictedTiles"],
      },
      REMOVE_FORBIDDEN_ZONE: {
        actions: ["removeRestrictedTiles"],
      },
      ADD_RESTRICTED_DIRECTIONS: {
        actions: ["addRestrictedZone"],
      },
      REMOVE_RESTRICTED_DIRECTIONS: {
        actions: ["remvoeRestrictedZone"],
      },
    },
    type: "parallel",
    states: {
      main: {
        initial: "idle",
        states: {
          idle: {
            on: {
              CALCULATE_NEXT_DIRECTION: {
                target: "checkingReversing",
                actions: [
                  () => console.log("CALCULATE_NEXT_DIRECTION"),
                  "saveDirectionRequest",
                  "getValidDirectionsFromReversing",
                ],
              },
            },
          },
          checkingReversing: {
            on: {
              REVERSING_DIRECTIONS_COMPLETE: {
                target: "checkingRestrictions",
                actions: [
                  "getValidDirectionsFromRestrictions",
                  (ctx, event) =>
                    console.log("REVERSING_DIRECTIONS_COMPLETE", event),
                ],
              },
            },
          },
          checkingRestrictions: {
            on: {
              RESTRICTED_DIRECTIONS_COMPLETE: {
                target: "idle",
                actions: [
                  "chooseDirection",
                  (ctx, event) =>
                    console.log("RESTRICTED_DIRECTIONS_COMPLETE", event),
                ],
              },
            },
          },
        },
      },
      reversing: {
        initial: "reversingBanned",
        states: {
          reversingBanned: {
            on: {
              REVERSING_ALLOWED: {
                target: "reversingAllowed",
              },
              GET_VALID_DIRECTIONS_FROM_REVERSING: {
                actions: ["filterDirectionsReversingBanned"],
              },
            },
          },
          reversingAllowed: {
            on: {
              GET_VALID_DIRECTIONS_FROM_REVERSING: {
                actions: ["filterDirectionsReversingAllowed"],
              },
              REVERSING_BANNED: {
                target: "reversingAllowed",
              },
            },
          },
        },
      },
      restrictions: {
        initial: "applyDirectionRestrictions",
        states: {
          applyDirectionRestrictions: {
            on: {
              GET_VALID_DIRECTIONS_FROM_RESTRICTIONS: {
                actions: ["filterDirectionsWithRestrictions"],
              },
              IGNORE_DIRECTION_RESTRICTIONS: {
                target: "ignoreDirectionRestrictions",
              },
            },
          },
          ignoreDirectionRestrictions: {
            on: {
              APPLY_DIRECTION_RESTRICTIONS: {
                target: "applyDirectionRestrictions",
                actions: ["changeSpeedWithMultipliers"],
              },
              GET_VALID_DIRECTIONS_FROM_RESTRICTIONS: {
                actions: ["filterDirectionsNoRestrictions"],
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      saveDirectionRequest: assign({ directionRequest: (ctx, event) => event }),
      getValidDirectionsFromReversing: send({
        type: "GET_VALID_DIRECTIONS_FROM_REVERSING",
        directions,
      }),
      filterDirectionsReversingBanned: send((ctx, event) => {
        const { direction } = ctx.directionRequest;
        const oppositeDirection = {
          left: "right",
          right: "left",
          up: "down",
          down: "up",
        };

        const validDirections = event.directions.filter(
          (validDirection) => oppositeDirection[direction] !== validDirection
        );
        return {
          type: "REVERSING_DIRECTIONS_COMPLETE",
          directions: validDirections,
        };
      }),

      filterDirectionsReversingAllowed: send((ctx, event) => {
        return {
          type: "REVERSING_DIRECTIONS_COMPLETE",
          directions: event.directions,
        };
      }),
      getValidDirectionsFromRestrictions: send({
        type: "GET_VALID_DIRECTIONS_FROM_RESTRICTIONS",
        directions,
      }),
      filterDirectionsWithRestrictions: send((ctx, event) => {
        const { maze, position, direction, targetTile } = ctx.directionRequest;
        const { restrictedZones, restrictedTiles } = ctx;
        console.log(restrictedZones);
        const nextPosition = getProjectedPosition(
          { direction, row: position.row, col: position.col },
          direction,
          true
        );

        let restrictedDirectionsAtNextPosition = [];
        Object.keys(restrictedZones).forEach((zoneKey) => {
          const { zone, restrictedDirections } = restrictedZones[zoneKey];
          if (isPositionWithinZone(nextPosition, zone)) {
            restrictedDirectionsAtNextPosition.push(...restrictedDirections);
          }
        });

        let filteredDirections = [...directions].filter(
          (direction) => !restrictedDirectionsAtNextPosition.includes(direction)
        );

        filteredDirections = filteredDirections.filter((direction) => {
          const projectedPosition = getProjectedPosition(
            { row: nextPosition.row, col: nextPosition.col },
            direction,
            true
          );
          const isRestrictedTile =
            restrictedTiles[tileToString(projectedPosition)];
          return !isRestrictedTile;
        });
        console.log("FILTER", filteredDirections);
        return {
          type: "RESTRICTED_DIRECTIONS_COMPLETE",
          directions: filteredDirections,
        };
      }),
      filterDirectionsNoRestrictions: send((ctx, event) => {
        return {
          type: "RESTRICTED_DIRECTIONS_COMPLETE",
          directions: event.directions,
        };
      }),
      chooseDirection: sendParent((ctx, event) => {
        const { maze, direction, position, targetTile } = ctx.directionRequest;
        const nextDirection = chooseNextDirection({
          maze,
          direction,
          position,
          targetTile,
          directions: event.directions,
        });

        return { type: "UPDATE_NEXT_DIRECTION", nextDirection };
      }),

      addRestrictedTiles: assign({
        restrictedTiles: (ctx, event) => {
          const restrictedTiles = { ...ctx.restrictedTiles };
          event.tiles.forEach(
            (tile) => (restrictedTiles[tileToString(event.tile)] = tile)
          );
          return restrictedTiles;
        },
      }),
      removeRestrictedTiles: assign({
        restrictedTiles: (ctx, event) => {
          const newRestrictedTiles = { ...ctx.restrictedTiles };
          event.tiles.forEach(
            (tile) => delete newRestrictedTiles[tileToString(tile)]
          );
          return newRestrictedTiles;
        },
      }),
      addRestrictedZone: assign({
        restrictedZones: (ctx, event) => {
          return {
            ...ctx.restrictedDirections,
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

function chooseNextDirection({
  maze,
  position,
  direction,
  directions,
  targetTile,
}) {
  // the ghosts look one tile ahead and choose what direction they will take when they get to the next tile

  let nextDirection = "up";
  const nextPosition = getProjectedPosition(
    { direction, row: position.row, col: position.col },
    direction,
    true
  );

  let validDirections = directions.filter((direction) => {
    const projectedPosition = getProjectedPosition(
      { row: nextPosition.row, col: nextPosition.col },
      direction,
      true
    );
    const isWall = getTileType(maze.tiles, projectedPosition) === "wall";
    return !isWall;
  });

  if (validDirections.length > 1) {
    // we choose the direction that moves us closer to the target tile
    // need to find the projected position for each valid direction we could choose
    const distanceToTargetIfDirectionChosen = validDirections.map(
      (direction) => {
        const projectedPosition = getProjectedPosition(
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
  console.log("direction chosen", nextDirection);
  return nextDirection;
}

export default DirectionMachine;
