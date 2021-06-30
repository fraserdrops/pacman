export const makeSquiggle = (
  startX,
  startY,
  length,
  squiggleStep,
  squiggleAmplitude
) => {
  // Adjust step so that there are a whole number of steps along the path
  let lengthStep = length / squiggleStep;
  let pos = { x: startX, y: startY };

  let newPath = "M" + [pos.x, pos.y + 0.5].join(",");
  let side = -1;
  for (let i = 1; i <= squiggleStep; i++) {
    let last = pos;
    pos = { x: startX + lengthStep * i, y: startY };

    // Find a point halfway between last and pos. Then find the point that is
    // perpendicular to that line segment, and is squiggleAmplitude away from
    // it on the side of the line designated by 'side' (-1 or +1).
    // This point will be the control point of the quadratic curve forming the
    // squiggle step.

    // The vector from the last point to this one
    let vector = { x: pos.x - last.x, y: pos.y - last.y };
    // The length of this vector
    let vectorLen = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    // The point halfwasy between last point and tis one
    let half = { x: last.x + vector.x / 2, y: last.y + vector.y / 2 };
    // The vector that is perpendicular to 'vector'
    let perpVector = {
      x: -((squiggleAmplitude * vector.y) / vectorLen),
      y: (squiggleAmplitude * vector.x) / vectorLen,
    };
    // No calculate the control point position
    let controlPoint = {
      x: half.x + perpVector.x * side,
      y: half.y + perpVector.y * side,
    };

    if (i === squiggleStep) {
      pos.y += 0.5;
    }

    newPath += "Q" + [controlPoint.x, controlPoint.y, pos.x, pos.y].join(",");
    // Switch the side (for next step)
    side = -side;
  }
  return newPath;
};

const mapDirectionToEyePosition = {
  right: {
    leftEye: {
      x: 4,
      y: 5,
    },
    rightEye: {
      x: 10,
      y: 5,
    },
    pupilOffset: {
      x: 0.5,
      y: 0,
    },
  },
  down: {
    leftEye: {
      x: 3,
      y: 5,
    },
    rightEye: {
      x: 9,
      y: 5,
    },
    pupilOffset: {
      x: 0,
      y: 1,
    },
  },
  left: {
    leftEye: {
      x: 2,
      y: 5,
    },
    rightEye: {
      x: 8,
      y: 5,
    },
    pupilOffset: {
      x: -0.5,
      y: 0,
    },
  },
  up: {
    leftEye: {
      x: 3,
      y: 3,
    },
    rightEye: {
      x: 9,
      y: 3,
    },
    pupilOffset: {
      x: 0,
      y: -1,
    },
  },
};

export const getEyePositionFromDirection = (direction) => {
  return mapDirectionToEyePosition[direction];
};
