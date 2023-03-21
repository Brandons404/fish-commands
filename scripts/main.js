/**
 * Main file for Fish Commands.
 * Does not do anything other than requiring index.js.
 */

importPackage(Packages.arc);
importPackage(Packages.mindustry.type);

//Polyfills
Object.entries = o => Object.keys(o).map(k => [k, o[k]]);
Array.prototype.at = function(i){
	return this[i < 0 ? this.length + i : i];
}

require("index");