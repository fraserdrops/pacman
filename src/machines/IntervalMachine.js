import { actions, assign, createMachine, sendParent } from "xstate";
const { choose, raise } = actions;

const IntervalMachine = createMachine(
  {
    id: "timer",
    initial: "preppingNextInterval",
    context: {
      secondsRemaining: 0,
      eventType: "",
      intervals: [],
    },
    states: {
      preppingNextInterval: {
        always: [
          {
            cond: "hasNextInterval",
            target: "countingDown",
            actions: ["setNextInterval"],
          },
          {
            target: "complete",
          },
        ],
      },
      countingDown: {
        invoke: {
          id: "tick",
          src: (ctx) => (callback) => {
            const timeout = setInterval(() => {
              callback("TICK");
            }, 1000);
            return () => {
              clearTimeout(timeout);
            };
          },
        },
        on: {
          PAUSE: {
            target: "paused",
          },
          TICK: {
            actions: [
              "decrementSecondsRemaining",
              choose([
                {
                  cond: "intervalComplete",
                  actions: [raise("INTERVAL_COMPLETE")],
                },
              ]),
            ],
          },
          INTERVAL_COMPLETE: {
            target: "preppingNextInterval",
            actions: [
              sendParent((ctx) => ({ type: ctx.eventType })),
              "removeCurrentInterval",
            ],
          },
        },
      },
      paused: {
        on: {
          RESUME: {
            target: "countingDown",
          },
        },
      },
      complete: {},
    },
  },
  {
    actions: {
      setNextInterval: assign({
        secondsRemaining: (ctx) => ctx.intervals[0].seconds,
        eventType: (ctx) => ctx.intervals[0].eventType,
      }),
      decrementSecondsRemaining: assign({
        secondsRemaining: (ctx) => ctx.secondsRemaining - 1,
      }),
      removeCurrentInterval: assign({
        intervals: (ctx) => ctx.intervals.slice(1),
      }),
    },
    guards: {
      hasNextInterval: (ctx) => ctx.intervals.length > 0,
      intervalComplete: (ctx) => ctx.secondsRemaining < 1,
    },
  }
);

export default IntervalMachine;
