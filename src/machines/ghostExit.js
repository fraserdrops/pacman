const send = () => {};

const ghostExitParallel = {
  type: "parallel",
  states: {
    ghosts: {
      initial: "pinkyActive",
      pinkyActive: {
        on: {
          UPDATE_PERSONAL_COUNTER: [
            {
              cond: "pinkyLeavePersonal",
              target: "inkyActive",
              actions: [{ type: "incrementPersonalCounter", ghost: "pinky" }],
            },
            {
              actions: [{ type: "incrementPersonalCounter", ghost: "pinky" }],
            },
          ],
          GLOBAL_COUNTER_INCREMENTED: [
            {
              cond: "pinkyLeaveGlobal",
              target: "inkyActive",
            },
            {
              cond: "shouldResetGlobalCounter",
              actions: [send("RESET_GLOBAL_COUNTER")],
            },
          ],
          NEXT_GHOST_LEAVE: {
            target: "inkyActive",
          },
        },
      },
      inkyActive: {
        on: {
          UPDATE_PERSONAL_COUNTER: [
            {
              cond: "inkyLeavePersonal",
              target: "clydeActive",
              actions: [{ type: "incrementPersonalCounter", ghost: "inky" }],
            },
            {
              actions: [{ type: "incrementPersonalCounter", ghost: "inky" }],
            },
          ],
          GLOBAL_COUNTER_INCREMENTED: [
            {
              cond: "inkyLeaveGlobal",
              target: "clydeActive",
            },
            {
              cond: "shouldResetGlobalCounter",
              actions: [send("RESET_GLOBAL_COUNTER")],
            },
          ],
          NEXT_GHOST_LEAVE: {
            target: "clydeActive",
          },
        },
      },
      clydeActive: {
        on: {
          UPDATE_PERSONAL_COUNTER: [
            {
              cond: "clydeLeavePersonal",
              target: "allGhostsExited",
              actions: [{ type: "incrementPersonalCounter", ghost: "clyde" }],
            },
            {
              actions: [{ type: "incrementPersonalCounter", ghost: "clyde" }],
            },
          ],
          GLOBAL_COUNTER_INCREMENTED: [
            {
              cond: "clydeLeaveGlobal",
              target: "allGhostsExited",
            },
            {
              cond: "shouldResetGlobalCounter",
              actions: [send("RESET_GLOBAL_COUNTER")],
            },
          ],
          NEXT_GHOST_LEAVE: {
            target: "allGhostsExited",
          },
        },
      },
      allGhostsExited: {
        type: "final",
      },
    },
    timer: {
      invoke: {
        src: (ctx) => (callback) => {
          const interval = setInterval(() => {
            callback("NEXT_GHOST_LEAVE_HOME");
          }, 3000);
          return () => {
            clearInterval(interval);
          };
        },
      },
      on: {
        PELLET_EATEN: {
          target: "timer",
          internal: false,
        },
      },
    },
    counter: {
      initial: "init",
      states: {
        init: {
          always: [
            {
              target: "personalCounters",
              cond: "noLivesLost",
            },
            { target: "globalCounter" },
          ],
        },
        personalCounters: {
          initial: "init",
          states: {
            init: {
              always: {
                actions: [send("UPDATE_PERSONAL_COUNTER")],
              },
            },
          },
          on: {
            PELLET_EATEN: {
              actions: [
                "incrementPersonalCounter",
                "notifyPersonalCounterIncremented",
              ],
            },
          },
        },
      },
      globalCounter: {
        on: {
          PELLET_EATEN: {
            actions: [
              "incrementPersonalCounter",
              "notifyPersonalCounterIncremented",
            ],
          },
          RESET_GLOBAL_COUNTER: {
            target: "personalCounter",
            actions: ["resetGlobalCounter"],
          },
        },
      },
    },
  },
};

const ghostExit = {
  type: "parallel",
  states: {
    timer: {
      invoke: {
        src: (ctx) => (callback) => {
          const timeout = setInterval(() => {
            callback("NEXT_GHOST_LEAVE_HOME");
          }, 3000);
          return () => {
            clearTimeout(timeout);
          };
        },
      },
      on: {
        PELLET_EATEN: {
          target: "timer",
          internal: false,
        },
      },
    },
    counter: {
      initial: "init",
      states: {
        init: {
          always: [
            {
              target: "personalCounters",
              cond: "noLivesLost",
            },
            { target: "globalCounter" },
          ],
        },
        personalCounters: {
          initial: "pinkyActive",
          states: {
            pinkyActive: {
              always: {
                target: "inkyActive",
                actions: ["notifyPinkyLeaveHome"],
              },
            },
            inkyActive: {
              on: {
                PELLET_EATEN: [
                  {
                    cond: "inkyShouldLeavePersonal",
                    target: "clydeActive",
                    actions: ["notifyInkyLeaveHome"],
                  },
                ],
                NEXT_GHOST_LEAVE_HOME: {
                  target: "clydeActive",
                  actions: ["notifyInkyLeaveHome"],
                },
              },
            },
            clydeActive: {
              on: {
                PELLET_EATEN: [
                  {
                    cond: "clydeShouldLeavePersonal",
                    actions: ["notifyClydeLeaveHome"],
                  },
                ],
                NEXT_GHOST_LEAVE_HOME: {
                  actions: ["notifyClydeLeaveHome"],
                },
              },
            },
          },
        },
        globalCounter: {
          initial: "pinkyActive",
          on: {
            RESET_GLOBAL_COUNTER: {
              target: "personalCounter",
              actions: [],
            },
          },
          states: {
            pinkyActive: {
              on: {
                PELLET_EATEN: [
                  {
                    cond: "pinktShouldLeaveGlobal",
                    target: "inkyActive",
                    actions: ["notifyPinkyLeaveHome"],
                  },
                ],
                NEXT_GHOST_LEAVE_HOME: {
                  target: "inkyActive",
                  actions: ["notifyPinkyLeaveHome"],
                },
              },
            },
            inkyActive: {
              on: {
                PELLET_EATEN: [
                  {
                    cond: "inkyShouldLeaveGlobal",
                    target: "clydeActive",
                    actions: ["notifyInkyLeaveHome"],
                  },
                ],
                NEXT_GHOST_LEAVE_HOME: {
                  target: "clydeActive",
                  actions: ["notifyInkyLeaveHome"],
                },
              },
            },
            clydeActive: {
              on: {
                PELLET_EATEN: [
                  {
                    cond: "clydeShouldLeaveGlobal",
                    actions: ["notifyClydeLeaveHome"],
                  },
                ],
                NEXT_GHOST_LEAVE_HOME: {
                  actions: ["notifyClydeLeaveHome"],
                },
              },
            },
          },
        },
      },
    },
  },
};
