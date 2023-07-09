"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeStringColors = exports.parseTimeString = exports.logAction = exports.isImpersonator = exports.matchFilter = exports.escapeTextDiscord = exports.capitalizeText = exports.StringIO = exports.StringBuilder = exports.getTeam = exports.setToArray = exports.isCoreUnitType = exports.nearbyEnemyTile = exports.getColor = exports.to2DArray = exports.colorBadBoolean = exports.colorBoolean = exports.formatTimeRelative = exports.formatTime = exports.getTimeSinceText = exports.memoize = exports.keys = exports.list = exports.logg = void 0;
var api = require("./api");
var config_1 = require("./config");
var players_1 = require("./players");
function logg(msg) { Call.sendMessage(msg); }
exports.logg = logg;
function list(ar) { Call.sendMessage(ar.join(' | ')); }
exports.list = list;
function keys(obj) { Call.sendMessage(Object.keys(obj).join(' [scarlet]|[white] ')); }
exports.keys = keys;
var storedValues = {};
/**
 * Stores the output of a function and returns that value
 * instead of running the function again unless any
 * dependencies have changed to improve performance with
 * functions that have expensive computation.
 * @param callback function to run if a dependancy has changed
 * @param dep dependency array of values to monitor
 * @param id arbitrary unique id of the function for storage purposes.
 */
function memoize(callback, dep, id) {
    if (!storedValues[id]) {
        storedValues[id] = { value: callback(), dep: dep };
    }
    else if (dep.some(function (d, ind) { return d !== storedValues[id].dep[ind]; })) {
        //If the value changed
        storedValues[id].value = callback();
        storedValues[id].dep = dep;
    }
    return storedValues[id].value;
}
exports.memoize = memoize;
/**
 * Returns the amount of time passed since the old time in a readable format.
 */
function getTimeSinceText(old) {
    var timePassed = Date.now() - old;
    var hours = Math.floor((timePassed / (1000 * 60 * 60)) % 24);
    var minutes = Math.floor(timePassed / 60000);
    var seconds = Math.floor((timePassed % 60000) / 1000);
    var timeSince = '';
    if (hours)
        timeSince += "[green]".concat(hours, " [lightgray]hrs, ");
    if (minutes)
        timeSince += "[green]".concat(minutes, " [lightgray]mins, ");
    timeSince += "[green]".concat(seconds, " [lightgray]secs ago.");
    return timeSince;
}
exports.getTimeSinceText = getTimeSinceText;
;
function formatTime(time) {
    if (config_1.maxTime - (time + Date.now()) < 20000)
        return "forever";
    var months = Math.floor(time / (30 * 24 * 60 * 60 * 1000));
    var days = Math.floor((time % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    var hours = Math.floor((time % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    var minutes = Math.floor((time % (60 * 60 * 1000)) / (60 * 1000));
    var seconds = Math.floor((time % (60 * 1000)) / (1000));
    return [
        months && "".concat(months, " months"),
        days && "".concat(days, " days"),
        hours && "".concat(hours, " hours"),
        minutes && "".concat(minutes, " minutes"),
        seconds && "".concat(seconds, " seconds"),
    ].filter(function (s) { return s; }).join(", ");
}
exports.formatTime = formatTime;
function formatTimeRelative(time, raw) {
    var difference = Math.abs(time - Date.now());
    if (time > Date.now())
        return (raw ? "" : "in ") + formatTime(difference);
    else
        return formatTime(difference) + (raw ? "" : " ago");
}
exports.formatTimeRelative = formatTimeRelative;
function colorBoolean(val) {
    return val ? "[green]true[]" : "[red]false[]";
}
exports.colorBoolean = colorBoolean;
function colorBadBoolean(val) {
    return val ? "[red]true[]" : "[green]false[]";
}
exports.colorBadBoolean = colorBadBoolean;
function to2DArray(array, width) {
    if (array.length == 0)
        return [];
    var output = [[]];
    array.forEach(function (el) {
        if (output.at(-1).length >= width) {
            output.push([]);
        }
        output.at(-1).push(el);
    });
    return output;
}
exports.to2DArray = to2DArray;
function getColor(input) {
    try {
        if (input.includes(',')) {
            var formattedColor = input.split(',');
            var col = {
                r: Number(formattedColor[0]),
                g: Number(formattedColor[1]),
                b: Number(formattedColor[2]),
                a: 255,
            };
            return new Color(col.r, col.g, col.b, col.a);
        }
        else if (input.includes('#')) {
            return Color.valueOf(input);
        }
        else if (input in Color) {
            return Color[input];
        }
        else {
            return null;
        }
    }
    catch (e) {
        return null;
    }
}
exports.getColor = getColor;
function nearbyEnemyTile(unit, dist) {
    //because the indexer is buggy
    if (dist > 10)
        throw new Error("nearbyEnemyTile(): dist (".concat(dist, ") is too high!"));
    var x = Math.floor(unit.x / Vars.tilesize);
    var y = Math.floor(unit.y / Vars.tilesize);
    for (var i = -dist; i <= dist; i++) {
        for (var j = -dist; j <= dist; j++) {
            var build = Vars.world.build(x + i, y + j);
            if (build && build.team != unit.team)
                return build;
        }
    }
    return null;
}
exports.nearbyEnemyTile = nearbyEnemyTile;
/**
 * This function is necessary due to a bug with UnitChangeEvent. It can be removed in the next release after v142.
 * @deprecated
 * */
function isCoreUnitType(type) {
    return [UnitTypes.alpha, UnitTypes.beta, UnitTypes.gamma, UnitTypes.evoke, UnitTypes.incite, UnitTypes.emanate].includes(type);
}
exports.isCoreUnitType = isCoreUnitType;
function setToArray(set) {
    var array = [];
    set.each(function (item) { return array.push(item); });
    return array;
}
exports.setToArray = setToArray;
function getTeam(team) {
    if (team in Team && Team[team] instanceof Team)
        return Team[team];
    else if (Team.baseTeams.find(function (t) { return t.name.includes(team.toLowerCase()); }))
        return Team.baseTeams.find(function (t) { return t.name.includes(team.toLowerCase()); });
    else if (!isNaN(Number(team)))
        return "\"".concat(team, "\" is not a valid team string. Did you mean \"#").concat(team, "\"?");
    else if (!isNaN(Number(team.slice(1)))) {
        var num = Number(team.slice(1));
        if (num <= 255 && num >= 0 && Number.isInteger(num))
            return Team.all[Number(team.slice(1))];
        else
            return "Team ".concat(team, " is outside the valid range (integers 0-255).");
    }
    return "\"".concat(team, "\" is not a valid team string.");
}
exports.getTeam = getTeam;
var StringBuilder = /** @class */ (function () {
    function StringBuilder(str) {
        if (str === void 0) { str = ""; }
        this.str = str;
    }
    StringBuilder.prototype.add = function (str) {
        this.str += str;
        return this;
    };
    StringBuilder.prototype.chunk = function (str) {
        if (Strings.stripColors(str).length > 0) {
            this.str = this.str + " " + str;
        }
        return this;
    };
    return StringBuilder;
}());
exports.StringBuilder = StringBuilder;
var StringIO = /** @class */ (function () {
    function StringIO(string) {
        if (string === void 0) { string = ""; }
        this.string = string;
        this.offset = 0;
    }
    StringIO.prototype.read = function (length) {
        if (length === void 0) { length = 1; }
        if (this.offset + length > this.string.length)
            throw new Error("Unexpected EOF");
        return this.string.slice(this.offset, this.offset += length);
    };
    StringIO.prototype.write = function (str) {
        this.string += str;
    };
    StringIO.prototype.readString = function (/** The length of the written length. */ lenlen) {
        if (lenlen === void 0) { lenlen = 3; }
        var length = parseInt(this.read(lenlen));
        if (length == 0)
            return null;
        return this.read(length);
    };
    StringIO.prototype.writeString = function (str, lenlen, truncate) {
        if (lenlen === void 0) { lenlen = 3; }
        if (truncate === void 0) { truncate = false; }
        if (str === null) {
            this.string += "0".repeat(lenlen);
        }
        else if (str.length > (Math.pow(10, lenlen) - 1)) {
            if (truncate) {
                Log.err("Cannot write strings with length greater than ".concat((Math.pow(10, lenlen) - 1)));
                this.string += (Math.pow(10, lenlen) - 1).toString().padStart(lenlen, "0");
                this.string += str.slice(0, (Math.pow(10, lenlen) - 1));
            }
            else {
                throw new Error("Cannot write strings with length greater than ".concat((Math.pow(10, lenlen) - 1)));
            }
        }
        else {
            this.string += str.length.toString().padStart(lenlen, "0");
            this.string += str;
        }
    };
    StringIO.prototype.readNumber = function (size) {
        if (size === void 0) { size = 4; }
        var data = this.read(size);
        if (Pattern.matches("^0*-\\d+$", data)) {
            //negative numbers were incorrectly stored in previous versions
            data = "-" + data.split("-")[1];
        }
        if (isNaN(Number(data)))
            throw new Error("Attempted to read invalid number: ".concat(data));
        return Number(data);
    };
    StringIO.prototype.writeNumber = function (num, size) {
        if (size === void 0) { size = 4; }
        if (typeof num != "number")
            throw new Error("".concat(num, " was not a number!"));
        this.string += num.toString().padStart(size, "0");
    };
    StringIO.prototype.readBool = function () {
        return this.read(1) == "T" ? true : false;
    };
    StringIO.prototype.writeBool = function (val) {
        this.write(val ? "T" : "F");
    };
    StringIO.prototype.writeArray = function (array, func, lenlen) {
        var _this = this;
        this.writeNumber(array.length, lenlen);
        array.forEach(function (e) { return func(e, _this); });
    };
    StringIO.prototype.readArray = function (func, lenlen) {
        var length = this.readNumber(lenlen);
        var array = [];
        for (var i = 0; i < length; i++) {
            array[i] = func(this);
        }
        return array;
    };
    StringIO.prototype.expectEOF = function () {
        if (this.string.length > this.offset)
            throw new Error("Expected EOF, but found extra data: \"".concat(this.string.slice(this.offset), "\""));
    };
    StringIO.read = function (data, func) {
        var str = new StringIO(data);
        return func(str);
    };
    StringIO.write = function (data, func) {
        var str = new StringIO();
        func(str, data);
        return str.string;
    };
    return StringIO;
}());
exports.StringIO = StringIO;
function capitalizeText(text) {
    return text
        .split(" ")
        .map(function (word, i, arr) {
        return (["a", "an", "the", "in", "and", "of", "it"].includes(word) &&
            i !== 0 && i !== arr.length - 1) ?
            word : word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}
exports.capitalizeText = capitalizeText;
var pattern = Pattern.compile("([*\\_~`|:])");
function escapeTextDiscord(text) {
    return pattern.matcher(text).replaceAll("\\\\$1");
}
exports.escapeTextDiscord = escapeTextDiscord;
function matchFilter(text) {
    var e_1, _a;
    //Replace substitutions
    var replacedText = Strings.stripColors(text).split("").map(function (char) { var _a; return (_a = config_1.substitutions[char]) !== null && _a !== void 0 ? _a : char; }).join("").toLowerCase();
    var _loop_1 = function (word, whitelist) {
        if (replacedText.includes(word)) {
            var moreReplacedText_1 = replacedText;
            whitelist.forEach(function (w) { return moreReplacedText_1 = moreReplacedText_1.replace(new RegExp(w, "g"), ""); });
            if (moreReplacedText_1.includes(word))
                return { value: true };
        }
    };
    try {
        for (var bannedWords_1 = __values(config_1.bannedWords), bannedWords_1_1 = bannedWords_1.next(); !bannedWords_1_1.done; bannedWords_1_1 = bannedWords_1.next()) {
            var _b = __read(bannedWords_1_1.value, 2), word = _b[0], whitelist = _b[1];
            var state_1 = _loop_1(word, whitelist);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (bannedWords_1_1 && !bannedWords_1_1.done && (_a = bannedWords_1.return)) _a.call(bannedWords_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return false;
}
exports.matchFilter = matchFilter;
function isImpersonator(name) {
    //Replace substitutions
    var replacedText = Strings.stripColors(name).split("").map(function (char) { var _a; return (_a = config_1.substitutions[char]) !== null && _a !== void 0 ? _a : char; }).join("").toLowerCase();
    if (replacedText.includes("server"))
        return true; //name contains server
    if (Pattern.matches("^[ ]*<.{1,3}>[\\s\\S]*", replacedText))
        return true; //name starts with <c>, fake role prefix
    return false;
}
exports.isImpersonator = isImpersonator;
function logAction(action, by, to, reason, duration) {
    var name, uuid, ip;
    var actor = typeof by === "string" ? by : by.name;
    if (to instanceof players_1.FishPlayer) {
        name = escapeTextDiscord(to.name);
        uuid = to.uuid;
        ip = to.player.ip();
    }
    else {
        name = escapeTextDiscord(to.lastName);
        uuid = to.id;
        ip = to.lastIP;
    }
    api.sendModerationMessage("".concat(actor, " ").concat(action, " ").concat(name, " ").concat(duration ? "for ".concat(formatTime(duration), " ") : "").concat(reason ? "with reason ".concat(escapeTextDiscord(reason)) : "", "\n**Server:** ").concat((0, config_1.getGamemode)(), "\n**uuid:** `").concat(uuid, "`\n**ip**: `").concat(ip, "`"));
}
exports.logAction = logAction;
/**@returns the number of seconds. */
function parseTimeString(str) {
    var e_2, _a;
    var formats = [
        [/(\d+)s/, 1],
        [/(\d+)m/, 60],
        [/(\d+)h/, 3600],
        [/(\d+)d/, 86400],
        [/(\d+)w/, 604800]
    ].map(function (_a) {
        var _b = __read(_a, 2), regex = _b[0], mult = _b[1];
        return [Pattern.compile(regex.source), mult];
    });
    if (str == "forever")
        return (config_1.maxTime - Date.now() - 10000);
    try {
        for (var formats_1 = __values(formats), formats_1_1 = formats_1.next(); !formats_1_1.done; formats_1_1 = formats_1.next()) {
            var _b = __read(formats_1_1.value, 2), pattern_1 = _b[0], mult = _b[1];
            //rhino regex doesn't work
            var matcher = pattern_1.matcher(str);
            if (matcher.matches()) {
                var num = Number(matcher.group(1));
                if (!isNaN(num))
                    return (num * mult) * 1000;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (formats_1_1 && !formats_1_1.done && (_a = formats_1.return)) _a.call(formats_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return null;
}
exports.parseTimeString = parseTimeString;
/**Prevents Mindustry from displaying color tags in a string by escaping them. Example: turns [scarlet]red to [[scarlet]red. */
function escapeStringColors(str) {
    return str.replace(/\[/g, "[[");
}
exports.escapeStringColors = escapeStringColors;
