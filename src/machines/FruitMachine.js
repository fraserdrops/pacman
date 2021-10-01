import { actions, createMachine, sendParent, assign } from "xstate";
import IntervalMachine from "./IntervalMachine";

const Ticker = (context) => (cb) => {
  const interval = setInterval(() => {
    cb("TICK");
  }, 1000 * context.interval);

  return () => {
    clearInterval(interval);
  };
};

const Timer = createMachine({
  initial: "running",
  context: {
    elapsed: 0,
    duration: 5,
    interval: 1,
  },
  states: {
    running: {
      invoke: {
        src: Ticker,
      },
      on: {
        PAUSE: {
          target: "paused",
        },
        TICK: {
          actions: ["incrementElapsedTime"],
        },
      },
    },
    paused: {
      on: {
        RESUME: {
          target: "running",
        },
      },
    },
  },
});

const Ticker2 = createMachine({
  initial: "ticking",
  states: {
    ticking: {
      invoke: {
        src: Ticker,
      },
      on: {
        PAUSE: {
          target: "paused",
        },
        TICK: {
          actions: ["notifyParent"],
        },
      },
    },
    paused: {
      on: {
        RESUME: {
          target: "ticking",
        },
      },
    },
  },
});

const Timer2 = createMachine({
  initial: "active",
  states: {
    active: {
      invoke: {
        src: Ticker2,
      },
      on: {
        PAUSE: {
          actions: ["pauseTimer"],
        },
        RESUME: {
          actions: ["incrementElapsedTime"],
        },
        TICK: {
          actions: ["incrementElapsedTime"],
        },
      },
    },
  },
});

const Watch = createMachine({
  context: {
    elapsed: 0,
    duration: 5,
    interval: 1,
  },
  initial: "countdown",
  states: {
    countdown: {
      states: {
        running: {
          invoke: {
            src: Ticker,
          },
          on: {
            PAUSE: {
              target: "paused",
            },
            TICK: {
              actions: ["incrementElapsedTime"],
            },
          },
        },
        paused: {
          on: {
            RESUME: {
              target: "running",
            },
          },
        },
      },
    },
    timer: {
      states: {
        running: {
          invoke: {
            src: Ticker,
          },
          on: {
            PAUSE: {
              target: "paused",
            },
            TICK: {
              actions: ["incrementElapsedTime"],
            },
          },
        },
        paused: {
          on: {
            RESUME: {
              target: "running",
            },
          },
        },
      },
    },
  },
});

export default Timer;
