const players = require('players');
const utils = require('utils');

let serverCommands;

const menuStuff = {
  listeners: {},
  flattenedNonStaffPlayers: [],
  lastOptionIndex: 0,
};

// stop
const stopListener = (player, option) => {
  if (option === -1 || option === menuStuff.lastOptionIndex) return;

  const fishPlr = players.getP(player);

  if (!fishPlr.mod && !fishPlr.admin) {
    player.kick('You tried to access a menu incorrectly.');
    return;
  }

  const pObj = utils.plrById(menuStuff.flattenedNonStaffPlayers[option]);

  players.stop(pObj, player);
  player.sendMessage(pObj.name + '[#48e076] was stopped.');
  return;
};

// mute
const muteListener = (player, option) => {
  if (option === -1 || option === menuStuff.lastOptionIndex) return;

  const fishPlr = players.getP(player);

  if (!fishPlr.mod && !fishPlr.admin) {
    player.kick('You tried to access a menu incorrectly.');
    return;
  }

  const pObj = utils.plrById(menuStuff.flattenedNonStaffPlayers[option]);

  p.muted = !p.muted;
  player.sendMessage(pObj.name + '[#48e076] was ' + p.muted ? 'muted.' : 'unmuted');
  players.setName(pObj);
  pObj.sendMessage(
    p.muted
      ? '[yellow] Hey! You have been muted. You can still use /msg to send a message to someone though.'
      : '[green]You have been unmuted.'
  );
  players.addPlayerHistory(pObj.uuid(), {
    action: tp.muted ? 'muted' : 'unmuted',
    by: player.name,
    time: Date.now(),
  });
  players.save();

  return;
};

// warn
const warnListener = (player, option) => {
  if (option === -1 || option === menuStuff.lastOptionIndex) return;

  const fishPlr = players.getP(player);

  if (!fishPlr.mod && !fishPlr.admin) {
    player.kick('You tried to access a menu incorrectly.');
    return;
  }

  const p = players.getPById(menuStuff.flattenedNonStaffPlayers[option]);
  const pObj = utils.plrById(menuStuff.flattenedNonStaffPlayers[option]);

  p.stopped = true;
  pObj.unit().type = UnitTypes.stell;
  player.sendMessage(pObj.name + '[#48e076] was stopped.');
  players.setName(pObj);
  pObj.sendMessage("[scarlet]Oopsy Whoopsie! You've been stopped, and marked as a griefer.");
  players.addPlayerHistory(pObj.uuid(), {
    action: 'stopped',
    by: player.name,
    time: Date.now(),
  });
  players.save();

  return;
};

// ip ban
const ipBanListener = (player, option) => {
  if (option === -1 || option === menuStuff.lastOptionIndex) return;

  const fishPlr = players.getP(player);

  if (!fishPlr.mod && !fishPlr.admin) {
    player.kick('You tried to access a menu incorrectly.');
    return;
  }

  const pObj = utils.plrById(menuStuff.flattenedNonStaffPlayers[option]);

  serverCommands.handleMessage('ban ip ' + pObj.ip());

  player.sendMessage(pObj.name + '[#48e076] was banned.');

  return;
};

Events.on(ServerLoadEvent, (e) => {
  menuStuff.listeners.stop = Menus.registerMenu(stopListener);
  menuStuff.listeners.mute = Menus.registerMenu(muteListener);
  menuStuff.listeners.warn = Menus.registerMenu(warnListener);
  menuStuff.listeners.ipban = Menus.registerMenu(ipBanListener);
  serverCommands = Core.app.listeners.find(
    (l) => l instanceof Packages.mindustry.server.ServerControl
  ).handler;
});

const getMenus = () => {
  return menuStuff.listeners;
};
module.exports = {
  menuStuff: menuStuff,
  getMenus: getMenus,
};
