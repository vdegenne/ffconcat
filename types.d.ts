declare global {
	export type FFmpegPreset =
		| 'ultrafast'
		| 'superfast'
		| 'veryfast'
		| 'faster'
		| 'fast'
		| 'medium'
		| 'slow'
		| 'slower'
		| 'veryslow'
		| 'placebo'

	type ConcatMode =
		| 'demux-copy' // Demux all files in one using copy (default)
		/**
		 * Use ffmpeg `-filter_complex` option to concatenate all files without making reencoding temp files.
		 */
		| 'filter'
	// | 'demux-reenc' // Demux all files in one and reencode
	// | 'reenc-demux-copy' // Reencode each file, demux them in one using copy

	interface SharedOptions {
		/** @default fast */
		preset: FFmpegPreset
		output: string
		/**
		 * If yes option is provided, force and overwrite existing files
		 * @default false
		 */
		yes: boolean
		debug: boolean
		/** @default false */
		verbose: boolean
		/** @default false */
		print: boolean
	}

	interface ConcatOptions extends SharedOptions {
		reencode?: boolean
		mode: ConcatMode
		fade?: number
	}

	interface OverlayOptions extends SharedOptions {}

	interface FFmpegInfo {
		dimensions: [number, number]
		duration: number
		framerate: number
		audio: boolean
	}

	type FilterFunction = (info: FFmpegInfo) => boolean
}
export {}
