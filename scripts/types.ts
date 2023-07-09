import type { CommandArgType, Perm } from "./commands";
import type { FishPlayer } from "./players";


export type FishCommandArgType = string | number | FishPlayer | Team | boolean | null;
export type MenuListener = (player:mindustryPlayer, option:number) => void;

/** Returns the type for an arg type string. Example: returns `number` for "time". */
export type TypeOfArgType<T> =
	T extends "string" ? string :
	T extends "boolean" ? boolean :
	T extends "number" ? number :
	T extends "time" ? number :
	T extends "team" ? Team :
	T extends "player" ? FishPlayer :
	T extends "exactPlayer" ? FishPlayer :
	never;

//TLDR: Yeet U through a wormhole, then back through the same wormhole, and it comes out the other side as an intersection type
export type UnionToIntersection<U> = (
	(
		//(U extends any) triggers the distributive conditional type behavior
		//The conditional type is distributed across the members of the union
		//so this makes `Cons<U1> | Cons<U2> | Cons<U3>`
		U extends any ? (_: U) => void : never
		//Then when infer is used to extract the parameter of Cons, it must be something that satisfies all the function types
		//which is an intersection of the types
	) extends (_: infer I) => void ? I : never
) extends infer O ? {[K in keyof O] : O[K]} : never; //This doesn't change the actual type, but makes vscode display it nicely

/**
 * Returns the type of args given a union of the arg string types.
 * Example: given `"player:player?" | "force:boolean"` returns `{player: FishPlayer | null; force: boolean;}`
 **/
export type ArgsFromArgStringUnion<ArgStringUnion extends string> =
	[ArgStringUnion] extends [never] ? Record<string, any> : //If any was passed, return Record<string, any>
	0 extends (1 & ArgStringUnion) ? Record<string, any> : //If any was passed, return Record<string, any>
	UnionToIntersection<ObjectTypeFor<ArgStringUnion>>;
//Typescript distributes the generic across the union type, producing a union of all the objects types, then we convert the union to an intersection

export type ObjectTypeFor<ArgString> =
	ArgString extends `${string}?` //Check if it's optional
	//It is optional
	? ArgString extends `${infer N}:${infer T}?` //Use inferred template literal types to extract the name into N and the type string into T
		? {[_ in N]: TypeOfArgType<T> | null} : never //Make an object, using TypeOfArgType to turn "player" into FishPlayer
	//It isn't optional
	: ArgString extends `${infer N}:${infer T}` //Same as above, but without the `| null`
		? {[_ in N]: TypeOfArgType<T>} : never;


export interface FishCommandRunner<ArgType extends string> {
	(_:{
		/**Raw arguments that were passed to the command. */
		rawArgs:(string | undefined)[];
		/**Formatted and parsed args. Access an argument by name, like python's keyword args. Example: `args.player.setRank(Rank.mod);`. An argument can only be null if it was optional, otherwise the command will error before the handler runs. */
		args:ArgsFromArgStringUnion<ArgType>;
		/**The player who ran the command. */
		sender:FishPlayer;
		outputSuccess:(message:string) => void;
		outputFail:(message:string) => void;
		output:(message:string) => void;
		/**Executes a server console command. Be careful! */
		execServer:(message:string) => void;
		/**List of every registered command, including this one. */
		allCommands:Record<string, FishCommandData<any>>;
		/**Timestamp of the last time this command was run successfully by any player. */
		lastUsedSuccessfully:number;
		/**Timestamp of the last time this command was run by the current sender. */
		lastUsedSender:number;
		/**Timestamp of the last time this command was run succesfully by the current sender. */
		lastUsedSuccessfullySender:number;
	}): unknown;
}

export interface FishConsoleCommandRunner<ArgType extends string> {
	(_:{
		/**Raw arguments that were passed to the command. */
		rawArgs:(string | undefined)[];
		/**
		 * Formatted and parsed args.
		 * Access an argument by name, like python's keyword args.
		 * Example: `args.player.mod = true`.
		 * An argument can only be null if it was optional, otherwise the command will error before the handler runs.
		 **/
		args:ArgsFromArgStringUnion<ArgType>;
		outputSuccess:(message:string) => void;
		outputFail:(message:string) => void;
		output:(message:string) => void;
		/**Executes a server console command. Do not commit recursion as that will cause a crash.*/
		execServer:(message:string) => void;
		/**Timestamp of the last time this command was run. */
		lastUsed:number;
		/**Timestamp of the last time this command was run succesfully. */
		lastUsedSuccessfully:number;
	}): unknown;
}

export interface FishCommandData<ArgType extends string> {
	/**Args for this command, like ["player:player", "reason:string?"] */
	args: ArgType[];
	description: string;
	/**
	 * Permission level required for players to run this command.
	 * If the player does not have this permission, the handler is not run and an error message is printed.
	 **/
	perm: Perm;
	/**Custom error message for unauthorized players. The default is `You do not have the required permission (mod) to execute this command`. */
	customUnauthorizedMessage?: string;
	handler: FishCommandRunner<ArgType>;
	/**If true, this command is hidden and pretends to not exist for players that do not have access to it.. */
	isHidden?: boolean;
}
export interface FishConsoleCommandData<ArgType extends string> {
	/**Args for this command, like ["player:player", "reason:string?"] */
	args: ArgType[];
	description: string;
	handler: FishConsoleCommandRunner<ArgType>;
}


export interface TileHistoryEntry {
	name:string;
	action:string;
	type:string;
	time:number;
}


export interface FishPlayerData {
	uuid: string;
	name: string;
	muted: boolean;
	autoflagged: boolean;
	/**@deprecated */
	member: boolean;
	/**@deprecated */
	stopped: boolean;
	unmarkTime: number;
	rank: string;
	flags: string[];
	highlight: string | null;
	rainbow: { speed:number; } | null;
	history: PlayerHistoryEntry[];
	usid: string | null;
}

export interface PlayerHistoryEntry {
	action:string;
	by:string;
	time:number;
}

export interface ClientCommandHandler {
	register(name:string, args:string, description:string, runner:(args:string[], player:mindustryPlayer) => unknown):void;
	removeCommand(name:string):void;
}

export interface ServerCommandHandler {
	/**Executes a server console command. */
	handleMessage(command:string):void;
	register(name:string, args:string, description:string, runner:(args:string[], player:mindustryPlayer) => unknown):void;
	removeCommand(name:string):void;
}

export interface PreprocessedCommandArg {
	type: CommandArgType;
	/**Whether the argument is optional (and may be null) */
	optional?: boolean;
}

export type PreprocessedCommandArgs = Record<string, PreprocessedCommandArg>;

export interface CommandArg {
	name: string;
	type: CommandArgType;
	isOptional: boolean;
}

export interface FlaggedIPData {
	name: string;
	uuid: string;
	ip: string;
	moderated: boolean;
};
