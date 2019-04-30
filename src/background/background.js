const UPDATED = false;
const EVENTS = { //jshint ignore:line
    connected: "veeraConnected",
    suppliesUpdated: "suppliesUpdated",
    dailyReset: "dailyReset",
    weeklyReset: "weeklyReset",
    monthlyReset: "monthlyReset",
    gotLoot: "gotLoot",
    shopPurchase: "shopPurchase",
//    newBattle: new Event("newBattle")
};

window.addEventListener(EVENTS.connected, MainInit);
//window.addEventListener("newBattle", );

DevTools.wait(); //Listen for devtools conn

function MainInit() {
    DevTools.query("tabId").then(id => {
            State.game.linkToTab(id).then(() => console.group("Loading data"));
        })
        .then(State.load)
        .then(Supplies.load)
        .then(Raids.load)
        .then(Profile.load)
        .then(() => {
            console.groupEnd();
            console.group("Setting up");
            console.log("Initializing UI.");
            updateUI("init", {theme: State.theme.current,
                              planner: Planner.listSeries(),
                              unfEdition: State.unfEdition,
                              raids: Raids.getList()});
            updateUI("updSupplies", Supplies.getAll());
//            updateUI("updStatus", Profile.status);
            updateUI("updCurrencies", Profile.currencies);
            updateUI("updPendants", Profile.pendants);
            updateUI("updArca", Profile.arcarum);

            console.log("Setting up listeners.");
            window.addEventListener(EVENTS.dailyReset, () => Raids.reset());
            window.addEventListener(EVENTS.suppliesUpdated, evhCheckRaidSupplyData);

            Time.sync();
            Time.checkReset();

            if (State.store.guild) {
                updateUI("updGuild", `#guild/detail/${State.store.guild}`);
            }

            console.groupEnd();
        })
        .catch(e => {
            DevTools.disconnect();
            console.error(e);
        });
}

//Old function, kept for now due to ease of reading intended use.
function updateUI (type, value) {
    DevTools.send(type, value);
}

function fireEvent(name, data) {
    if (data) {
        window.dispatchEvent(new CustomEvent(name, {detail: data}));
    }
    else {
        window.dispatchEvent(new Event(name));
    }
}

function showNotif(text, desc) {
    if (Notification.permission == "granted") {
        let n = new Notification(text, {body: desc});
        setTimeout(() => n.close(), 6000);//TODO: add to State.settings
    }
    else if (Notification.permission == "default"){
        Notification.requestPermission().then(p => {
            if (p == "granted") { showNotif(text, desc); }
        });
    }
}

//Utils
/*function Enum(...names) { //eh it's neat but can't auto-complete and not JSON
    let idx = 1;
    Object.defineProperty(this, "dict", {
        enumerable: false,
        value: {}
    });

    for (let name of names) {
        this.dict[idx] = name;
        this[name] = idx;
        idx++;
    }
    Object.freeze(this.dict);
    Object.freeze(this);
}
Enum.prototype.getName = function (value) {
    return this.dict[value];
};*/

function getEnumNamedValue(list, val) { //for the simple plain obj enum actually used
    return Object.entries(list).find(x => x[1] == val)[0];
}

const DOM_PARSER = new DOMParser();
function parseDom(data, {decode = true, mime = "text/html"} = {}) {
    if (decode) { data = decodeURIComponent(data); }
    return DOM_PARSER.parseFromString(data, mime);
}

//Adding a last item in array macro
Object.defineProperty(Array.prototype, "last", {
    get: function () {
        return this.length == 0 ? 0 : this[this.length - 1];
    }
});

/*
This creates a new, "flattened" or "jsonified" object, including prototype chain properties.
Used mostly to send data to the UI with getters or otherwise stripped enumerable props triggered/set.
So that we can actually use prototype chaining... a main feature of the language...
*/
Object.defineProperty(Object.prototype, "pack", {
    enumerable: false,
    value: function () {
        let o = {};
        for (let prop in this) {
            let type = typeof this[prop];
            if (type == "object") {
                o[prop] = this[prop].pack();
            }
            else if (type != "function"){
                o[prop] = this[prop];
            }
        }
        return o;
    }
});
