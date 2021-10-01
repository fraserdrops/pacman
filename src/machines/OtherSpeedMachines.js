import {
  createMachine,
  spawn,
  assign,
  actions,
  send,
  sendParent,
} from "xstate";
const TwoWayMulti = createMachine(
  {
    id: "TwoWayMulti",
    initial: "channelOne",
    context: {
      channelOne: undefined,
      channelTwo: undefined,
      activeChannel: undefined,
      changeEventType: "VALUE_CHANGE",
    },
    on: {
      TICK: {},
    },
    states: {
      channelOne: {
        on: {
          CHANGE_CHANNEL_ONE_VAL: {
            actions: ["changeChannelOneValue", "notifyParentChannelOne"],
          },
          CHANGE_CHANNEL_TWO_VAL: {
            actions: ["changeChannelTwoValue"],
          },
          SWITCH_CHANNEL_TWO: {
            target: "channelTwo",
            actions: ["notifyParentChannelTwo"],
          },
        },
      },
      channelTwo: {
        SWITCH_CHANNEL_ONE: {
          target: "channelOne",
          actions: ["notifyParentChannelOne"],
        },
        CHANGE_CHANNEL_ONE_VAL: {
          actions: ["changeChannelOneValue"],
        },
        CHANGE_CHANNEL_TWO_VAL: {
          actions: ["changeChannelTwoValue", "notifyParentChannelTwo"],
        },
      },
    },
  },
  {
    actions: {
      changeChannelOneValue: assign({
        channelOne: (ctx, event) => event.value,
      }),
      changeChannelTwoValue: assign({
        channelTwo: (ctx, event) => event.value,
      }),

      notifyParentChannelOne: sendParent((ctx, event) => ({
        type: ctx.changeEventType,
        value: ctx.channelOne,
      })),
      notifyParentChannelTwo: sendParent((ctx, event) => ({
        type: ctx.changeEventType,
        value: ctx.channelTwo,
      })),
    },
  }
);

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
        CHANGE_SPEED: {
          target: "ticking",
          internal: false,
          actions: [assign({ intervalMS: (ctx, event) => event.intervalMS })],
        },
      },
    },
  },
});

const SpeedMultiMachine = createMachine(
  {
    id: "Speed",
    initial: "init",
    context: {
      standardInterval: undefined,
      overridenInterval: undefined,
      normalOrSpecial: undefined,
      speedMulti: undefined,
    },
    invoke: {
      src: TickerMachine,
      id: "speedTicker",
      data: {
        intervalMS: (ctx, event) => ctx.standardInterval,
        callbackEventName: "TICK",
      },
    },
    on: {
      TICK: {
        actions: [() => console.log("GHOST"), sendParent("TICK")],
      },
    },
    states: {
      init: {
        always: {
          target: "regularSpeed",
          actions: [
            assign((ctx) => {
              const normalOrSpecial = spawn(
                TwoWayMulti.withContext({
                  channelOne: undefined,
                  channelTwo: undefined,
                  activeChannel: undefined,
                  changeEventType: "NOS_VALUE_CHANGE",
                })
              );
              const speedMulti = spawn(
                TwoWayMulti.withContext({
                  channelOne: undefined,
                  channelTwo: undefined,
                  activeChannel: undefined,
                  changeEventType: "SPEED_VALUE_CHANGE",
                })
              );
              return { ...ctx, normalOrSpecial, speedMulti };
            }),
          ],
        },
      },
      regularSpeed: {
        on: {
          CHANGE_REGULAR_SPEED: {
            actions: [
              send(
                (ctx, event) => ({
                  type: "CHANGE_CHANNEL_ONE_VAL",
                  value: event.intervalMS,
                }),
                { to: (ctx) => ctx.normalOrSpecial }
              ),
            ],
          },
          CHANGE_SPECIAL_SPEED: {
            actions: [
              send(
                (ctx, event) => ({
                  type: "CHANGE_CHANNEL_TWO_VAL",
                  value: event.intervalMS,
                }),
                { to: (ctx) => ctx.normalOrSpecial }
              ),
            ],
          },
          NOS_VALUE_CHANGE: {
            actions: [
              send(
                (ctx, event) => ({
                  type: "CHANGE_CHANNEL_ONE_VAL",
                  value: event.intervalMS,
                }),
                { to: (ctx) => ctx.speedMulti }
              ),
            ],
          },
          CHANGE_OVERRIDEN_SPEED: {
            actions: [
              send(
                (ctx, event) => ({
                  type: "CHANGE_CHANNEL_TWO_VAL",
                  value: event.intervalMS,
                }),
                { to: (ctx) => ctx.speedMulti }
              ),
            ],
          },
          SWITCH_TO_REGULAR: {
            actions: [
              send((ctx, event) => ({ type: "SWITCH_CHANNEL_ONE" }), {
                to: (ctx) => ctx.normalOrSpecial,
              }),
            ],
          },
          SWITCH_TO_SPECIAL: {
            actions: [
              send((ctx, event) => ({ type: "SWITCH_CHANNEL_TWO" }), {
                to: (ctx) => ctx.normalOrSpecial,
              }),
            ],
          },
          SWITCH_TO_NO_OVERRIDE: {
            actions: [
              send((ctx, event) => ({ type: "SWITCH_CHANNEL_TWO" }), {
                to: (ctx) => ctx.speedMulti,
              }),
            ],
          },
          SWITCH_TO_OVERRIDEN: {
            actions: [
              send((ctx, event) => ({ type: "SWITCH_CHANNEL_ONE" }), {
                to: (ctx) => ctx.speedMulti,
              }),
            ],
          },

          changeSpeedRegular: {
            actions: [
              "changeSpeedRegular",
              assign({ standardInterval: (ctx, event) => event.intervalMS }),
            ],
          },
          OVERRIDE_SPEED: {
            target: "overridden",
            actions: [
              assign({ overridenInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedOverridden",
            ],
          },
          RESTORE_OVERRIDE: {
            target: "overriden",
          },
        },
      },
      overridden: {
        on: {
          OVERRIDE_SPEED: [
            {
              cond: "slowerSpeed",
              actions: [
                "changeSpeedOverridden",
                assign({ overridenInterval: (ctx, event) => event.intervalMS }),
              ],
            },
          ],
          CLEAR_OVERRIDE: {
            target: "regularSpeed",
            actions: ["changeSpeedRegular", () => console.log("YOZAYOZA")],
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
      changeSpeedOverridden: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.overridenInterval,
        }),
        { to: "speedTicker" }
      ),
      changeSpeedRegular: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.standardInterval,
        }),
        { to: "speedTicker" }
      ),
    },
  }
);

const SpeedMachine = createMachine(
  {
    id: "Speed",
    initial: "regularSpeed",
    context: {
      standardInterval: undefined,
      overridenInterval: undefined,
      currentBaseInterval: "",
      specialSpeedMultipliers: {},
    },
    invoke: {
      src: TickerMachine,
      id: "speedTicker",
      data: {
        intervalMS: (ctx, event) => ctx.standardInterval,
        callbackEventName: "TICK",
      },
    },
    on: {
      TICK: {
        actions: [() => console.log("GHOST"), sendParent("TICK")],
      },
      SPECIAL_SPEED: {
        actions: ["addSpecialSpeedMultiplierToList"],
      },
    },
    states: {
      regularSpeed: {
        on: {
          changeSpeedRegular: {
            actions: [
              "changeSpeedRegular",
              assign({ standardInterval: (ctx, event) => event.intervalMS }),
            ],
          },
          OVERRIDE_SPEED: {
            target: "frightened",
            actions: [
              assign({ overridenInterval: (ctx, event) => event.intervalMS }),
              "changeSpeedOverridden",
            ],
          },
        },
      },
      frightened: {
        on: {
          OVERRIDE_SPEED: [
            {
              cond: "slowerSpeed",
              actions: [
                "changeSpeedOverridden",
                assign({ overridenInterval: (ctx, event) => event.intervalMS }),
              ],
            },
          ],
          CLEAR_OVERRIDE: {
            target: "regularSpeed",
            actions: ["changeSpeedRegular", () => console.log("YOZAYOZA")],
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
      changeSpeedOverridden: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.overridenInterval,
        }),
        { to: "speedTicker" }
      ),
      changeSpeedRegular: send(
        (ctx, event) => ({
          type: "CHANGE_SPEED",
          intervalMS: ctx.standardInterval,
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
    },
  }
);
