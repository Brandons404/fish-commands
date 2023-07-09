import { menu } from "./menus";
import { FishPlayer } from "./players";
import { Rank } from "./ranks";
import type {
	ClientCommandHandler, CommandArg, FishCommandArgType, FishCommandData, FishConsoleCommandData,
	ServerCommandHandler
} from "./types";
import { getTeam, parseTimeString } from "./utils";

export const allCommands:Record<string, FishCommandData<any>> = {};
const globalUsageData:Record<string, {
	lastUsed: number;
	lastUsedSuccessfully: number;
}> = {};
const commandArgTypes = ["string", "number", "boolean", "player", "menuPlayer", "team", "time"] as const;
export type CommandArgType = typeof commandArgTypes extends ReadonlyArray<infer T> ? T : never;

/** Use this to get the correct type for command lists. */
export const commandList = <A extends Record<string, string>>(list:{
	//Store the mapping between commandname and ArgStringUnion in A
	[K in keyof A]: FishCommandData<A[K]>;
}):Record<string, FishCommandData<any>> => list;
/** Use this to get the correct type for command lists. */
export const consoleCommandList = <A extends Record<string, string>>(list:{
	//Store the mapping between commandname and ArgStringUnion in A
	[K in keyof A]: FishConsoleCommandData<A[K]>;
}):Record<string, FishConsoleCommandData<any>> => list;


//Cursed
type SelectPerm<T> = T extends infer A ? (
	A extends keyof typeof Perm ? (
		(typeof Perm)[A] extends Perm ? A : never
	) : never
) : never;
export type PermType = SelectPerm<keyof typeof Perm>;
/** Represents a permission that is required to do something. */
export class Perm {
	static none = new Perm("all", fishP => true, "[sky]");
	static mod = Perm.fromRank(Rank.mod);
	static admin = Perm.fromRank(Rank.admin);
	static member = new Perm("member", fishP => fishP.hasFlag("member") && !fishP.marked(), "[pink]", `You must have a [scarlet]Fish Membership[yellow] to use this command. Subscribe on the [sky]/discord[yellow]!`);
	static chat = new Perm("chat", fishP => (!fishP.muted && !fishP.autoflagged) || fishP.ranksAtLeast(Rank.mod));
	static bypassChatFilter = new Perm("bypassChatFilter", fishP => fishP.ranksAtLeast(Rank.admin));
	static seeMutedMessages = new Perm("seeMutedMessages", fishP => fishP.muted || fishP.autoflagged || fishP.ranksAtLeast(Rank.mod));
	static play = new Perm("play", fishP => (!fishP.marked() && !fishP.autoflagged) || fishP.ranksAtLeast(Rank.mod));
	static seeErrorMessages = new Perm("seeErrorMessages", fishP => fishP.ranksAtLeast(Rank.admin));
	static blockTrolling = new Perm("blockTrolling", fishP => fishP.rank === Rank.pi);
	static bulkLabelPacket = new Perm("bulkLabelPacket", fishP => fishP.ranksAtLeast(Rank.mod));
	static bypassVoteFreeze = new Perm("bypassVoteFreeze", fishP => fishP.ranksAtLeast(Rank.trusted));
	static changeTeam = new Perm("changeTeam", fishP => 
		Vars.state.rules.mode().name() === "sandbox" ? fishP.ranksAtLeast(Rank.trusted)
			: Vars.state.rules.mode().name() === "attack" ? fishP.ranksAtLeast(Rank.admin)
			: Vars.state.rules.mode().name() === "pvp" ? fishP.ranksAtLeast(Rank.mod)
			: fishP.ranksAtLeast(Rank.admin));
	constructor(public name:string, public check:(fishP:FishPlayer) => boolean, public color:string = "", public unauthorizedMessage:string = `You do not have the required permission (${name}) to execute this command`){}
	static fromRank(rank:Rank){
		return new Perm(rank.name, fishP => fishP.ranksAtLeast(rank), rank.color);
	}
}


/**Takes an arg string, like `reason:string?` and converts it to a CommandArg. */
function processArgString(str:string):CommandArg {
	//this was copypasted from mlogx haha
	const matchResult = str.match(/(\w+):(\w+)(\?)?/);
	if(!matchResult){
		throw new Error(`Bad arg string ${str}: does not match pattern word:word(?)`);
	}
	const [, name, type, isOptional] = matchResult;
	if((commandArgTypes.includes as (thing:string) => thing is CommandArgType)(type)){
		return { name, type, isOptional: !! isOptional };
	} else {
		throw new Error(`Bad arg string ${str}: invalid type ${type}`);
	}
}

export function formatArg(a:string){
	const isOptional = a.at(-1) == "?";
	const brackets = isOptional ? ["[", "]"] : ["<", ">"];
	return brackets[0] + a.split(":")[0] + brackets[1];
}

/** Joins multi-word arguments that have been groups with quotes. Ex: turns [`"a`, `b"`] into [`a b`]*/
function joinArgs(rawArgs:string[]){
	let outputArgs = [];
	let groupedArg:string[] | null = null;
	for(let arg of rawArgs){
		if(arg.startsWith(`"`) && groupedArg == null){
			groupedArg = [];
		}
		if(groupedArg){
			groupedArg.push(arg);
			if(arg.endsWith(`"`)){
				outputArgs.push(groupedArg.join(" ").slice(1, -1));
				groupedArg = null;
			}
		} else {
			outputArgs.push(arg);
		}
	}
	if(groupedArg != null){
		//return `Unterminated string literal.`;
		outputArgs.push(groupedArg.join(" "));
	}
	return outputArgs;
}

/**Takes a list of joined args passed to the command, and processes it, turning it into a kwargs style object. */
function processArgs(args:string[], processedCmdArgs:CommandArg[], allowMenus:boolean = true):{
	processedArgs: Record<string, FishCommandArgType>;
	unresolvedArgs: CommandArg[];
} | {
	error: string;
}{
	let outputArgs:Record<string, FishCommandArgType> = {};
	let unresolvedArgs:CommandArg[] = [];
	for(const [i, cmdArg] of processedCmdArgs.entries()){
		if(!(i in args) || args[i] === ""){
			//if the arg was not provided or it was empty
			if(cmdArg.isOptional){
				outputArgs[cmdArg.name] = null;
			} else if(cmdArg.type == "player" && allowMenus){
				outputArgs[cmdArg.name] = null;
				unresolvedArgs.push(cmdArg);
			} else return {error: `No value specified for arg ${cmdArg.name}. Did you type two spaces instead of one?`};
			continue;
		}

		//Deserialize the arg
		switch(cmdArg.type){
			case "player":
				const output = FishPlayer.getOneByString(args[i]);
				if(output == "none") return {error: `Player "${args[i]}" not found.`};
				else if(output == "multiple") return {error: `Name "${args[i]}" could refer to more than one player.`};
				outputArgs[cmdArg.name] = output;
				break;
			case "menuPlayer":
				return {error: `menuPlayer argtype is not yet implemented`};
				break;
			case "team":
				const team = getTeam(args[i]);
				if(typeof team == "string") return {error: team};
				outputArgs[cmdArg.name] = team;
				break;
			case "number":
				const number = parseInt(args[i]);
				if(isNaN(number)) return {error: `Invalid number "${args[i]}"`};
				outputArgs[cmdArg.name] = number;
				break;
			case "time":
				const milliseconds = parseTimeString(args[i]);
				if(milliseconds == null) return {error: `Invalid time string "${args[i]}"`};
				outputArgs[cmdArg.name] = milliseconds;
				break;
			case "string":
				outputArgs[cmdArg.name] = args[i];
				break;
			case "boolean":
				switch(args[i].toLowerCase()){
					case "true": case "yes": case "yeah": case "ya": case "ye": case "t": case "y": case "1": outputArgs[cmdArg.name] = true; break;
					case "false": case "no": case "nah": case "nay": case "nope": case "f": case "n": case "0": outputArgs[cmdArg.name] = false; break;
					default: return {error: `Argument ${args[i]} is not a boolean. Try "true" or "false".`};
				}
				break;
		}
	}
	return {processedArgs: outputArgs, unresolvedArgs};
}


function outputFail(message:string, sender:mindustryPlayer){
	sender.sendMessage(`[scarlet]⚠ [yellow]${message}`);
}
function outputSuccess(message:string, sender:mindustryPlayer){
	sender.sendMessage(`[#48e076]✔ ${message}`);
}
function outputMessage(message:string, sender:mindustryPlayer){
	sender.sendMessage(message);
}


const CommandError = (function(){}) as typeof Error;
Object.setPrototypeOf(CommandError.prototype, Error.prototype);
//Shenanigans necessary due to odd behavior of Typescript's compiled error subclass
export function fail(message:string):never {
	let err = new Error(message);
	Object.setPrototypeOf(err, CommandError.prototype);
	throw err;
}

/**Converts the CommandArg[] to the format accepted by Arc CommandHandler */
function convertArgs(processedCmdArgs:CommandArg[], allowMenus:boolean):string {
	return processedCmdArgs.map((arg, index, array) => {
		const isOptional = (arg.isOptional || (arg.type == "player" && allowMenus)) && !array.slice(index + 1).some(c => !c.isOptional);
		const brackets = isOptional ? ["[", "]"] : ["<", ">"];
		//if the arg is a string and last argument, make it variadic (so if `/warn player a b c d` is run, the last arg is "a b c d" not "a")
		return brackets[0] + arg.name + (["player", "string"].includes(arg.type) && index + 1 == array.length ? "..." : "") + brackets[1];
	}).join(" ");
}

/**
 * Registers all commands in a list to a client command handler.
 **/
export function register(commands:Record<string, FishCommandData<any>>, clientHandler:ClientCommandHandler, serverHandler:ServerCommandHandler){

	for(const [name, data] of Object.entries(commands)){

		//Process the args
		const processedCmdArgs = data.args.map(processArgString);
		clientHandler.removeCommand(name); //The function silently fails if the argument doesn't exist so this is safe
		clientHandler.register(
			name,
			convertArgs(processedCmdArgs, true),
			data.description,
			new Packages.arc.util.CommandHandler.CommandRunner({ accept: (unjoinedRawArgs:string[], sender:mindustryPlayer) => {
				const fishSender = FishPlayer.get(sender);

				//Verify authorization
				//as a bonus, this crashes if data.perm is undefined
				if(!data.perm.check(fishSender)){
					outputFail(data.customUnauthorizedMessage ?? data.perm.unauthorizedMessage, sender);
					return;
				}

				//closure over processedCmdArgs, should be fine
				//Process the args
				const rawArgs = joinArgs(unjoinedRawArgs);
				const output = processArgs(rawArgs, processedCmdArgs);
				if("error" in output){
					//if args are invalid
					outputFail(output.error, sender);
					return;
				}
				
				//Recursively resolve unresolved args (such as players that need to be determined through a menu)
				resolveArgsRecursive(output.processedArgs, output.unresolvedArgs, fishSender, () => {
					//Run the command handler
					const usageData = fishSender.getUsageData(name);
					let failed = false;
					try {
						data.handler({
							rawArgs,
							args: output.processedArgs,
							sender: fishSender,
							outputFail: message => {outputFail(message, sender); failed = true;},
							outputSuccess: message => outputSuccess(message, sender),
							output: message => outputMessage(message, sender),
							execServer: command => serverHandler.handleMessage(command),
							lastUsedSender: usageData.lastUsed,
							lastUsedSuccessfullySender: usageData.lastUsedSuccessfully,
							lastUsedSuccessfully: (globalUsageData[name] ??= {lastUsed: -1, lastUsedSuccessfully: -1}).lastUsedSuccessfully,
							allCommands
						});
						//Update usage data
						if(!failed){
							usageData.lastUsedSuccessfully = globalUsageData[name].lastUsedSuccessfully = Date.now();
						}
						usageData.lastUsed = globalUsageData[name].lastUsed = Date.now();
					} catch(err){
						usageData.lastUsed = Date.now();
						if(err instanceof CommandError){
							//If the error is a command error, then just outputFail
							outputFail(err.message, sender);
						} else {
							sender.sendMessage(`[scarlet]❌ An error occurred while executing the command!`);
							if(fishSender.hasPerm("seeErrorMessages")) sender.sendMessage((<any>err).toString());
						}
					}
				});
				
			}})
		);
		allCommands[name] = data;
	}
}

export function registerConsole(commands:Record<string, FishConsoleCommandData<any>>, serverHandler:ServerCommandHandler){

	for(const [name, data] of Object.entries(commands)){
		//Cursed for of loop due to lack of object.entries

		//Process the args
		const processedCmdArgs = data.args.map(processArgString);
		serverHandler.removeCommand(name); //The function silently fails if the argument doesn't exist so this is safe
		serverHandler.register(
			name,
			convertArgs(processedCmdArgs, false),
			data.description,
			new Packages.arc.util.CommandHandler.CommandRunner({ accept: (rawArgs:string[]) => {
				
				//closure over processedCmdArgs, should be fine
				//Process the args
				const output = processArgs(rawArgs, processedCmdArgs, false);
				if("error" in output){
					//ifargs are invalid
					Log.warn(output.error);
					return;
				}
				
				const usageData = (globalUsageData["_console_" + name] ??= {lastUsed: -1, lastUsedSuccessfully: -1});
				try {
					let failed = false;
					data.handler({
						rawArgs,
						args: output.processedArgs,
						outputFail: message => {Log.err(`${message}`); failed = true;},
						outputSuccess: message => Log.info(`${message}`),
						output: message => Log.info(message),
						execServer: command => serverHandler.handleMessage(command),
						...usageData
					});
					usageData.lastUsed = Date.now();
					if(!failed) usageData.lastUsedSuccessfully = Date.now();
				} catch(err){
					usageData.lastUsed = Date.now();
					if(err instanceof CommandError){
						Log.warn(`${err.message}`);
					} else {
						Log.err("&lrAn error occured while executing the command!&fr");
						Log.err(err as any);
					}
				}
			}})
		);
	}
}

/**Recursively resolves args. This function is necessary to handle cases such as a command that accepts multiple players that all need to be selected through menus. */
function resolveArgsRecursive(processedArgs: Record<string, FishCommandArgType>, unresolvedArgs:CommandArg[], sender:FishPlayer, callback:(args:Record<string, FishCommandArgType>) => void){
	if(unresolvedArgs.length == 0){
		callback(processedArgs);
	} else {
		const argToResolve = unresolvedArgs.shift()!;
		let optionsList:mindustryPlayer[] = [];
		//TODO Dubious implementation
		switch(argToResolve.type){
			case "player": Groups.player.each(player => optionsList.push(player)); break;
			default: throw new Error(`Unable to resolve arg of type ${argToResolve.type}`);
		}
		menu(`Select a player`, `Select a player for the argument "${argToResolve.name}"`, optionsList, sender, ({option}) => {
			processedArgs[argToResolve.name] = FishPlayer.get(option);
			resolveArgsRecursive(processedArgs, unresolvedArgs, sender, callback);
		}, true, player => player.name)

	}

}

