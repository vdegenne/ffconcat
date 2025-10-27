declare global {
	type AllKeysPresent<T, U extends readonly (keyof T)[]> =
		Exclude<keyof T, U[number]> extends never
			? true
			: ['❌ Missing keys', Exclude<keyof T, U[number]>]

	type AllValuesPresent<T, U extends readonly T[]> =
		Exclude<T, U[number]> extends never
			? true
			: ['❌ Missing values', Exclude<T, U[number]>]

	type ConcatMode =
		| 'filter-complex' // Use ffmpeg `-filter_complex` option
		| 'demux-copy' // Demux all files in one using copy (default)
		| 'demux-reenc' // Demux all files in one and reencode
		| 'reenc-demux-copy' // Reencode each file, demux them in one using copy

	interface CommandOptions {
		output: string
		reencode?: boolean
		mode: ConcatMode
		/**
		 * If yes option is provided, force and overwrite existing files
		 * @default false
		 */
		yes: boolean
		debug: boolean
		/** @default false */
		verbose: boolean
	}

	interface FFmpegInfo {
		dimensions: [number, number]
		duration: number
		framerate: number
		audio: boolean
	}

	type FilterFunction = (info: FFmpegInfo) => boolean
}
export {}
