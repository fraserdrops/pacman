import { Empty } from "./Empty";
import { HouseEntrance } from "./HouseEntrance";
import { Pellet } from "./Pellet";
import { PowerPellet } from "./PowerPellet";
import {
  WallExternalCornerBL,
  WallExternalCornerBR,
  WallExternalCornerTL,
  WallExternalCornerTR,
} from "./walls/WallExternalCorner";
import {
  WallExternalInternalBL,
  WallExternalInternalBR,
  WallExternalInternalLL,
  WallExternalInternalLR,
  WallExternalInternalRL,
  WallExternalInternalRR,
  WallExternalInternalTL,
  WallExternalInternalTR,
} from "./walls/WallExternalInternal";
import {
  WallExternalSmallCornerBL,
  WallExternalSmallCornerBR,
  WallExternalSmallCornerTL,
  WallExternalSmallCornerTR,
} from "./walls/WallExternalSmallCorner";
import {
  WallExternalStraightBottom,
  WallExternalStraightLeft,
  WallExternalStraightRight,
  WallExternalStraightTop,
} from "./walls/WallExternalStraight";
import {
  WallHouseCornerBL,
  WallHouseCornerBR,
  WallHouseCornerTL,
  WallHouseCornerTR,
} from "./walls/WallHouseCorner";
import {
  WallInternalCornerBL,
  WallInternalCornerBR,
  WallInternalCornerTL,
  WallInternalCornerTR,
} from "./walls/WallInternalCorner";
import { WallInternalFilled } from "./walls/WallInternalFilled";
import {
  WallInternalStraightBottom,
  WallInternalStraightLeft,
  WallInternalStraightRight,
  WallInternalStraightTop,
} from "./walls/WallInternalStraight";
import { Fruit } from "./Fruit";

export const getTileComponent = (tileType, display) => {
  const mapWallToComponent = {
    external: {
      corner: {
        tl: WallExternalCornerTL,
        tr: WallExternalCornerTR,
        br: WallExternalCornerBR,
        bl: WallExternalCornerBL,
      },
      straight: {
        left: WallExternalStraightLeft,
        top: WallExternalStraightTop,
        right: WallExternalStraightRight,
        bottom: WallExternalStraightBottom,
      },
      internal: {
        ll: WallExternalInternalLL,
        lr: WallExternalInternalLR,
        tl: WallExternalInternalTL,
        tr: WallExternalInternalTR,
        rl: WallExternalInternalRL,
        rr: WallExternalInternalRR,
        bl: WallExternalInternalBL,
        br: WallExternalInternalBR,
      },
      smallCorner: {
        tl: WallExternalSmallCornerTL,
        tr: WallExternalSmallCornerTR,
        br: WallExternalSmallCornerBR,
        bl: WallExternalSmallCornerBL,
      },
    },
    internal: {
      corner: {
        tl: WallInternalCornerTL,
        tr: WallInternalCornerTR,
        br: WallInternalCornerBR,
        bl: WallInternalCornerBL,
      },

      straight: {
        left: WallInternalStraightLeft,
        top: WallInternalStraightTop,
        right: WallInternalStraightRight,
        bottom: WallInternalStraightBottom,
      },
      filled: {
        all: WallInternalFilled,
      },
    },
    house: {
      corner: {
        tl: WallHouseCornerTL,
        tr: WallHouseCornerTR,
        br: WallHouseCornerBR,
        bl: WallHouseCornerBL,
      },
    },
  };

  if (tileType === "pellet") {
    return Pellet;
  }

  if (tileType === "powerPellet") {
    return PowerPellet;
  }

  if (tileType === "wall") {
    const { wallType, variant, orientation } = display;
    return mapWallToComponent[wallType][variant][orientation];
  }

  if (tileType === "empty" || tileType === "tunnel") {
    return Empty;
  }

  if (tileType === "houseEntrance") {
    return HouseEntrance;
  }

  if (tileType === "fruit") {
    return Fruit;
  }
};
