import Comms from "../net";
import _ from "lodash";
import midsummerAct3 from "../../midsummer3.json";

function castPlay(lines, actors) {
  // See how many cues each part has
  const cueCountByPart = {};
  for (var i = 0; i < lines.length; i++) {
    const part = lines[i].s; // S for speaker
    if (!cueCountByPart[part]) {
      cueCountByPart[part] = 0; // Initialize
    }
    cueCountByPart[part] += 1;
  }

  const parts = Object.keys(cueCountByPart);
  const partsByActor = {};
  for (const actor of actors) {
    partsByActor[actor] = [];
  }
  // Split parts keeping cue count even(ish)
  for (i = 0; i < parts.length; i++) {
    const actorWithFewestCues = _.minBy(actors, actorName => {
      return _.sum(_.map(partsByActor[actorName], p => cueCountByPart[p]));
    });
    partsByActor[actorWithFewestCues].push(parts[i]);
  }

  const actorsByPart = {};
  for (i = 0; i < parts.length; i++) {
    const part = parts[i];
    for (const actor of actors) {
      if (_.includes(partsByActor[actor], part)) {
        actorsByPart[part] = actor;
      }
    }
  }

  return { actorsByPart, partsByActor };
}

export default {
  state: {
    // These are for everyone
    comms: null,
    productions: [],
    plays: [{ title: "Midsummer Act 3" }],
    aspiration: "starting",
    actorsByPart: {},

    // These are for someone running a production
    playName: "Midsummer Act 3",
    invitationLink: "cuecannon.com/asdf",
    cast: [],
    casting: null,
    castMembers: [],
    lineNumber: 0,

    // These are for someone joining a production
    cue: "",
    part: ""
  },
  getters: {
    PLAY_NAME(state) {
      return state.playName;
    },
    INVITATION_LINK(state) {
      return state.invitationLink;
    },
    CAST(state) {
      return state.cast;
    },
    ASPIRATION(state) {
      return state.aspiration;
    },
    INVITOR(state) {
      return state.invitor;
    },
    PLAYS(state) {
      return state.plays;
    },
    PRODUCTIONS(state) {
      return state.productions;
    },
    CUE(state) {
      return state.cue;
    },
    PART(state) {
      return state.part;
    }
  },
  mutations: {
    SET_ASPIRATION(state, value) {
      state.aspiration = value;
    }
  },
  actions: {
    SELECT_PLAY({ state }, play) {
      state.playName = play.title;
      state.aspiration = "casting";
      state.cast = [];

      const id = state.comms.makeInvite(play.title);
      state.productions.push({ id, title: play.title });
    },
    MAKE_NEW_PRODUCTION({ state }) {
      state.aspiration = "browsing";
    },

    INIT_COMMS({ state }) {
      state.comms = new Comms();
      state.comms.onNewProduction = function(production) {
        state.productions.push(production);
      };
      state.comms.onAcceptInvite = function({ identity }) {
        state.castMembers.push(identity);
        state.casting = castPlay(midsummerAct3, state.castMembers);
        state.cast = _.map(state.casting.partsByActor, (parts, actor) => ({
          name: actor,
          roles: parts
        }));
      };
      state.comms.onBeginShow = function({ actorsByPart }) {
        state.actorsByPart = actorsByPart;
        state.lineNumber = 0;
        setCues();
      };

      state.comms.onCueNextActor = function() {
        state.lineNumber += 1;
        setCues();
      };

      function setCues() {
        const line = midsummerAct3[state.lineNumber];
        const currentActor = state.actorsByPart[line.s];
        if (currentActor === state.identity) {
          state.part = line.s;
          state.cue = line.t;
        } else {
          state.cue = "";
        }
      }

      state.comms.init();
    },

    async ACCEPT_INVITE({ state }, production) {
      state.aspiration = "cueing";
      state.identity = await state.comms.acceptInvite(production);
    },
    BEGIN_SHOW({ state }) {
      state.comms.beginShow(state.casting);
    },
    CUE_NEXT_ACTOR({ state }) {
      state.comms.cueNextActor();
    }
  }
};
