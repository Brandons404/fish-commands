import * as api from './api';
import { commandList, fail, formatArg, Perm } from './commands';
import { FishServers } from './config';
import { recentWhispers } from './globals';
import { Ohnos } from './ohno';
import { FishPlayer } from './players';
import { Rank, RoleFlag } from './ranks';
import { capitalizeText, getColor, StringBuilder, to2DArray } from './utils';
// import { votekickmanager } from './votes';

function teleportPlayer(player: mindustryPlayer, to: mindustryPlayer) {
	player.unit().set(to.unit().x, to.unit().y);
	Call.setPosition(player.con, to.unit().x, to.unit().y);
	Call.setCameraPosition(player.con, to.unit().x, to.unit().y);
}

export const commands = commandList({
	unpause: {
		args: [],
		description: 'Unpauses the game.',
		perm: Perm.play,
		handler() {
			Core.app.post(() => Vars.state.set(GameState.State.playing));
		},
	},

	tp: {
		args: ['player:player'],
		description: 'Teleport to another player.',
		perm: Perm.play,
		handler({ args, sender, outputFail }) {
			if (sender.unit()?.spawnedByCore) {
				teleportPlayer(sender.player, args.player.player);
			} else {
				outputFail(`Can only teleport while in a core unit.`);
			}
		},
	},

	clean: {
		args: [],
		description: 'Removes all boulders from the map.',
		perm: Perm.play,
		handler({sender, outputSuccess, lastUsedSuccessfully}){
			if(Date.now() - lastUsedSuccessfully < 100000) fail(`This command was run recently and is on cooldown.`);
			Timer.schedule(
				() => Call.sound(sender.con, Sounds.rockBreak, 1, 1, 0),
				0, 0.05, 10
			);
			Vars.world.tiles.eachTile((t:Tile) => {
				if(t.breakable() && t.block() instanceof Prop){
					t.removeNet();
				}
			});
			outputSuccess(`Cleared the map of boulders.`);
		}
	},

	die: {
		args: [],
		description: 'Commits die.',
		perm: Perm.play,
		handler({ sender }) {
			sender.unit()?.kill();
		},
	},

	discord: {
		args: [],
		description: 'Takes you to our discord.',
		perm: Perm.none,
		handler({ sender }) {
			Call.openURI(sender.con, 'https://discord.gg/VpzcYSQ33Y');
		},
	},

	tilelog: {
		args: ['persist:boolean?'],
		description: 'Checks the history of a tile.',
		perm: Perm.none,
		handler({ args, sender, output, outputSuccess }) {
			if (sender.tilelog === 'persist') {
				sender.tilelog = null;
				outputSuccess(`Tilelog disabled.`);
			} else {
				if (args.persist) {
					sender.tilelog = 'persist';
					outputSuccess(`Tilelog mode enabled. Click tiles to check their recent history. Run /tilelog again to disable.`);
				} else {
					sender.tilelog = 'once';
					output(`\n \n===>[yellow]Click on a tile to check its recent history...\n `);
				}
			}
		},
	},

	afk: {
		args: [],
		description: 'Toggles your afk status.',
		perm: Perm.none,
		handler({ sender, outputSuccess }) {
			sender.setFlag('afk', !sender.hasFlag('afk'));
			sender.updateName();
			if (sender.hasFlag('afk')) {
				outputSuccess(`You are now marked as AFK.`);
			} else {
				outputSuccess(`You are no longer marked as AFK.`);
			}
		},
	},

	tileid: {
		args: [],
		description: 'Checks id of a tile.',
		perm: Perm.none,
		handler({ sender, output }) {
			sender.tileId = true;
			output(`Click a tile to see its id...`);
		},
	},

	...Object.fromEntries(
		Object.entries(FishServers).map(([name, data]) => [
			name,
			{
				args: [],
				description: `Switches to the ${name} server.`,
				perm: Perm.none,
				handler({ sender }) {
					Call.sendMessage(`${sender.name}[magenta] has gone to the ${name} server. Use [cyan]/${name} [magenta]to join them!`);
					Call.connect(sender.con, data.ip, data.port);
				},
			},
		])
	),

	s: {
		args: ['message:string'],
		description: `Sends a message to staff only.`,
		perm: Perm.chat,
		handler({ sender, args, outputSuccess, output, outputFail, lastUsedSender }){
			if(!sender.ranksAtLeast(Rank.mod)){
				if(Date.now() - lastUsedSender < 2000) fail(`This command was used recently and is on cooldown.`);
				if(Date.now() - lastUsedSender < 5000) output(`[orange]Misuse of this command may result in a mute.`);
			}
			api.sendStaffMessage(args.message, sender.name, (sent) => {
				if(!sender.ranksAtLeast(Rank.mod)){
					if(sent){
						outputSuccess(`Message sent to [orange]all online staff.`);
					} else {
						const wasReceived = FishPlayer.messageStaff(sender.player.name, args.message);
						if(wasReceived) outputSuccess(`Message sent to staff.`);
						else outputFail(`No staff were online to receive your message.`);
					}
				}
			});
		},
	},

	/**
	 * This command is mostly for mobile (or players without foos).
	 *
	 * Since the player's unit follows the camera and we are moving the
	 * camera, we need to keep setting the players real position to the
	 * spot the command was made. This is pretty buggy but otherwise the
	 * player will be up the target player's butt
	 */
	watch: {
		args: ['player:player?'],
		description: `Watch/unwatch a player.`,
		perm: Perm.none,
		handler({ args, sender, outputSuccess, outputFail }) {
			if (sender.watch) {
				outputSuccess(`No longer watching a player.`);
				sender.watch = false;
			} else if (args.player) {
				sender.watch = true;
				const stayX = sender.unit().x;
				const stayY = sender.unit().y;
				const target = args.player.player;
				const watch = () => {
					if (sender.watch) {
						// Self.X+(172.5-Self.X)/10
						Call.setCameraPosition(sender.con, target.unit().x, target.unit().y);
						sender.unit().set(stayX, stayY);
						Timer.schedule(() => watch(), 0.1, 0.1, 0);
					} else {
						Call.setCameraPosition(sender.con, stayX, stayY);
					}
				};

				watch();
			} else {
				outputFail(`No player to unwatch.`);
			}
		},
	},

	help: {
		args: ['name:string?'],
		description: 'Displays a list of all commands.',
		perm: Perm.none,
		handler({ args, output, outputFail, sender, allCommands }) {
			const formatCommand = (name: string, color: string) =>
				new StringBuilder()
					.add(`${color}/${name}`)
					.chunk(`[white]${allCommands[name].args.map(formatArg).join(' ')}`)
					.chunk(`[lightgray]- ${allCommands[name].description}`).str;
			const formatList = (commandList: string[], color: string) => commandList.map((c) => formatCommand(c, color)).join('\n');

			if (args.name && isNaN(parseInt(args.name)) && !['mod', 'admin', 'member'].includes(args.name)) {
				//name is not a number or a category, therefore it is probably a command name
				if (args.name in allCommands && (!allCommands[args.name].isHidden || allCommands[args.name].perm.check(sender))) {
					output(
`Help for command ${args.name}:
	${allCommands[args.name].description}
	Usage: [sky]/${args.name} [white]${allCommands[args.name].args.map(formatArg).join(' ')}
	Permission required: ${allCommands[args.name].perm.name}`.replace("\t", "    ")
					);
				} else {
					outputFail(`Command "${args.name}" does not exist.`);
				}
			} else {
				const commands: {
					[P in 'player' | 'mod' | 'admin' | 'member']: string[];
				} = {
					player: [],
					mod: [],
					admin: [],
					member: [],
				};
				Object.entries(allCommands).forEach(([name, data]) =>
					(data.perm === Perm.admin ? commands.admin : data.perm === Perm.mod ? commands.mod : data.perm === Perm.member ? commands.member : commands.player).push(name)
				);
				const chunkedPlayerCommands: string[][] = to2DArray(commands.player, 15);

				switch (args.name) {
					case 'admin':
						output(`${Perm.admin.color}-- Admin commands --\n` + formatList(commands.admin, Perm.admin.color));
						break;
					case 'mod':
						output(`${Perm.mod.color}-- Mod commands --\n` + formatList(commands.mod, Perm.mod.color));
						break;
					case 'member':
						output(`${Perm.member.color}-- Member commands --\n` + formatList(commands.member, Perm.member.color));
						break;
					default:
						const pageNumber = args.name !== null ? parseInt(args.name) : 1;
						if (pageNumber - 1 in chunkedPlayerCommands) {
							output(`[sky]-- Commands page [lightgrey]${pageNumber}/${chunkedPlayerCommands.length}[sky] --\n` + formatList(chunkedPlayerCommands[pageNumber - 1], '[sky]'));
						} else {
							outputFail(`"${args.name}" is an invalid page number.`);
						}
				}
			}
		},
	},

	msg: {
		args: ['player:player', 'message:string'],
		description: 'Send a message to only one player.',
		perm: Perm.chat,
		handler({ args, sender, output }) {
			recentWhispers[args.player.uuid] = sender.uuid;
			args.player.sendMessage(`${sender.player.name}[lightgray] whispered:[#0ffffff0] ${args.message}`);
			output(`[#0ffffff0]Message sent to ${args.player.player.name}[#0ffffff0].`);
		},
	},

	r: {
		args: ['message:string'],
		description: 'Reply to the most recent message.',
		perm: Perm.chat,
		handler({ args, sender, output, outputFail }) {
			if (recentWhispers[sender.uuid]) {
				const recipient = FishPlayer.getById(recentWhispers[sender.uuid]);
				if (recipient?.connected()) {
					recentWhispers[recentWhispers[sender.uuid]] = sender.uuid;
					recipient.sendMessage(`${sender.name}[lightgray] whispered:[#0ffffff0] ${args.message}`);
					output(`[#0ffffff0]Message sent to ${recipient.name}[#0ffffff0].`);
				} else {
					outputFail(`The person who last messaged you doesn't seem to exist anymore. Try whispering to someone with [white]"/msg <player> <message>"`);
				}
			} else {
				outputFail(`It doesn't look like someone has messaged you recently. Try whispering to them with [white]"/msg <player> <message>"`);
			}
		},
	},

	trail: {
		args: ['type:string?', 'color:string?'],
		description: 'Use command to see options and toggle trail on/off.',
		perm: Perm.none,
		handler({ args, sender, output, outputFail, outputSuccess }) {
			//overload 1: type not specified
			if (!args.type) {
				if (sender.trail != null) {
					sender.trail = null;
					outputSuccess(`Trail turned off.`);
				} else {
					const options = [
						'1 - fluxVapor (flowing smoke, long lasting)',
						'2 - overclocked (diamonds)',
						'3 - overdriven (squares)',
						'4 - shieldBreak (smol)',
						'5 - upgradeCoreBloom (square, long lasting, only orange)',
						'6 - electrified (tiny spiratic diamonds, but only green)',
						'7 - unitDust (same as above but round, and can change colors)',
						'[white]Usage: [orange]/trail [lightgrey]<type> [color/#hex/r,g,b]',
					];
					output(`Available types:[yellow]\n` + options.join('\n'));
				}
				return;
			}

			//overload 2: type specified
			const trailTypes = {
				"1": 'fluxVapor',
				"2": 'overclocked',
				"3": 'overdriven',
				"4": 'shieldBreak',
				"5": 'upgradeCoreBloom',
				"6": 'electrified',
				"7": 'unitDust',
			};

			const selectedType = trailTypes[args.type as keyof typeof trailTypes] as string | undefined;
			if (!selectedType) {
				if (Object.values(trailTypes).includes(args.type)) outputFail(`Please use the numeric id to refer to a trail type.`);
				else outputFail(`"${args.type}" is not an available type.`);
				return;
			}

			const color = args.color ? getColor(args.color) : Color.white;
			if (color instanceof Color) {
				sender.trail = {
					type: selectedType,
					color,
				};
			} else {
				outputFail(
`[scarlet]Sorry, "${args.color}" is not a valid color.
[yellow]Color can be in the following formats:
[pink]pink [white]| [gray]#696969 [white]| 255,0,0.`
				);
			}
		},
	},

	ohno: {
		args: [],
		description: 'Spawns an ohno.',
		perm: Perm.play,
		handler({ sender, outputFail }) {
			const canSpawn = Ohnos.canSpawn(sender);
			if (canSpawn === true) {
				Ohnos.makeOhno(sender.team(), sender.player.x, sender.player.y);
			} else {
				outputFail(canSpawn);
			}
		},
	},

	ranks: {
		args: [],
		description: 'Displays information about all ranks.',
		perm: Perm.none,
		handler({ output }) {
			output(
				`List of ranks:\n` +
					Object.values(Rank.ranks)
						.map((rank) => `${rank.prefix} ${rank.color}${capitalizeText(rank.name)}[]: ${rank.color}${rank.description}[]\n`)
						.join('') +
					`List of flags:\n` +
					Object.values(RoleFlag.flags)
						.map((flag) => `${flag.prefix} ${flag.color}${capitalizeText(flag.name)}[]: ${flag.color}${flag.description}[]\n`)
						.join('')
			);
		},
	},

	team: {
		args: ['team:team', 'player:player'],
		description: 'Changes the team of a player.',
		perm: Perm.changeTeam,
		handler({ args, sender, outputSuccess }) {
			if (!sender.canModerate(args.player, true)) fail(`You do not have permission to change the team of this player.`);

			args.player.player.team(args.team);
			outputSuccess(`Changed team of player ${args.player.name} to ${args.team.name}.`);
		},
	},

	rank: {
		args: ['player:player'],
		description: 'Displays the rank of a player.',
		perm: Perm.none,
		handler({ args, output }) {
			output(`Player ${args.player.cleanedName}'s rank is ${args.player.rank.color}${args.player.rank.name}[].`);
		},
	},

	// votekick: {
	//	 args: ["target:player"],
	//	 description: "Starts a vote to kick a player.",
	//	 perm: Perm.play,
	//	 handler({args, sender}){
	// 		if(votekickmanager.currentSession) fail(`There is already a votekick in progress.`);
	// 		votekickmanager.start({
	// 			initiator: sender,
	// 			target: args.player
	// 		});
	//	 }
	// },

	// vote: {
	//	 args: ["vote:boolean"],
	//	 description: "Use /votekick instead.",
	//	 perm: Perm.play,
	//	 handler({sender, args}){
	// 		votekickmanager.handleVote(sender, args ? 1 : -1);
	//	 }
	// }
});
