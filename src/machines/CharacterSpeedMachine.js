import { actions, assign, createMachine, send, sendParent } from "xstate";

const TickerMachine = createMachine({
  id: "ticker",
  initial: "ticking",
  context: {
    intervalMS: undefined,
    callbackEventName: "TICK",
  },
  states: {
    ticking: {
      invoke: {
        src: (ctx) => (callback) => {
          const interval = setInterval(() => {
            callback("TICK");
          }, ctx.intervalMS);
          return () => {
            clearInterval(interval);
          };
        },
      },
      on: {
        TICK: {
          actions: [sendParent((ctx) => ({ type: ctx.callbackEventName }))],
        },
        PAUSE: {
          target: "paused",
        },
        CHANGE_SPEED: {
          target: "ticking",
          internal: false,
          actions: [assign({ intervalMS: (ctx, event) => event.intervalMS })],
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

const CharacterSpeedMachine = createMachine(
  {
    id: "Speed",
    initial: "applySpeedMultipliers",
    context: {
      currentBaseInterval: 1000,
      specialSpeedMultipliers: {},
      standardInterval: 1000,
    },
    invoke: {
      src: TickerMachine,
      id: "speedTicker",
      data: {
        intervalMS: (ctx, event) => ctx.currentBaseInterval,
        callbackEventName: "TICK",
      },
    },
    on: {
      TICK: {
        actions: [sendParent("TICK")],
      },
      PAUSE: {
        actions: ["pauseTicker"],
      },
      RESUME: {
        actions: ["resumeTicker"],
      },
    },
    states: {
      applySpeedMultipliers: {
        on: {
          CHANGE_SPEED: {
            actions: [
              assign({ currentBaseInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedWithMultipliers",
            ],
          },
          OVERRIDE_SPEED_MULTIPLIERS: {
            target: "ignoreMultipliers",
            actions: ["changeSpeedOverridden"],
          },
          SPECIAL_SPEED: {
            actions: [
              "addSpecialSpeedMultiplierToList",
              "changeSpeedWithMultipliers",
            ],
          },
          REMOVE_SPECIAL_SPEED: {
            actions: [
              "removeSpecialSpeedMultiplierFromList",
              "changeSpeedWithMultipliers",
            ],
          },
        },
      },
      ignoreMultipliers: {
        on: {
          APPLY_SPEED_MULTIPLIERS: {
            target: "applySpeedMultipliers",
            actions: ["changeSpeedWithMultipliers"],
          },
          SPECIAL_SPEED: {
            actions: ["addSpecialSpeedMultiplierToList"],
          },
          CHANGE_SPEED: {
            actions: [
              assign({ currentBaseInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedOverridden",
            ],
          },
          REMOVE_SPECIAL_SPEED: {
            actions: ["removeSpecialSpeedMultiplierFromList"],
          },
        },
      },
    },
  },
  {
    guards: {
      slowerSpeed: (ctx, event) => event.intervalMS < ctx.overridenInterval,
    },
    actions: {
      changeSpeedWithMultipliers: send(
        (ctx, event) => {
          let intervalMS = ctx.currentBaseInterval;
          Object.values(ctx.specialSpeedMultipliers).forEach(
            (multiplier) => (intervalMS = intervalMS / multiplier)
          );
          return {
            type: "CHANGE_SPEED",
            intervalMS,
          };
        },
        { to: "speedTicker" }
      ),
      changeSpeedOverridden: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.currentBaseInterval,
        }),
        { to: "speedTicker" }
      ),
      addSpecialSpeedMultiplierToList: assign({
        specialSpeedMultipliers: (ctx, event) => {
          return {
            ...ctx.specialSpeedMultipliers,
            [event.specialKey]: event.specialMultiplier,
          };
        },
      }),
      removeSpecialSpeedMultiplierFromList: assign({
        specialSpeedMultipliers: (ctx, event) => {
          let newMulitpliers = { ...ctx.specialSpeedMultipliers };
          delete newMulitpliers[event.specialKey];
          return newMulitpliers;
        },
      }),
      pauseTicker: send(
        {
          type: "PAUSE",
        },
        { to: "speedTicker" }
      ),
      resumeTicker: send(
        {
          type: "PAUSE",
        },
        { to: "speedTicker" }
      ),
    },
  }
);

export default CharacterSpeedMachine;
