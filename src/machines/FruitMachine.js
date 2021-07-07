import { actions, createMachine, sendParent } from "xstate";
import IntervalMachine from "./IntervalMachine";

const Fruit = createMachine({
  id: "fruit",
  initial: "ripe",
  context: {
    value: 100,
  },
  states: {
    ripe: {
      invoke: {
        src: IntervalMachine.withContext({
          intervals: [
            {
              eventType: "GONE_ROTTEN",
              seconds: 9 + Math.random(),
            },
          ],
        }),
      },
      on: {
        FRUIT_EATEN: {
          target: "eaten",
        },
        GONE_ROTTEN: {
          target: "removed",
          actions: [sendParent("REMOVE_FRUIT")],
        },
      },
    },
    eaten: {
      tags: ["eaten"],
      invoke: {
        src: IntervalMachine.withContext({
          intervals: [{ eventType: "REMOVE_FRUIT", seconds: 3 }],
        }),
      },
      on: {
        REMOVE_FRUIT: {
          target: "removed",
          actions: [sendParent("REMOVE_FRUIT")],
        },
      },
    },
    removed: {},
  },
});

export default Fruit;
