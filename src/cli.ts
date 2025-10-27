import {Logger} from '@vdegenne/debug'
import chalk from 'chalk'
import {Command} from 'commander'
import {MODES, PRESETS} from './constants.js'
import {demuxCopy} from './ffmpeg/demux-copy.js'
import {demuxReenc} from './ffmpeg/demux-reenc.js'
import {getAllVideoFiles} from './utils.js'
import {VideosManager} from './VideosManager.js'
import {filterComplex} from './ffmpeg/filter-complex.js'

const logger = new Logger({
	alwaysLog: true,
	color: chalk.yellow,
	errorColor: chalk.red,
})

const program = new Command()

program
	.name('ffconcat')
	.description('Concatenate multiple video files using FFmpeg')
	.version('1.0.0')
	.option(
		'-m, --mode <mode>',
		`Concatenation mode (${MODES.join(', ')})`,
		<ConcatMode>'demux-copy',
	)
	.option(
		'-f, --fade [value]',
		'fade value in seconds between clips (only works in "filter" mode)',
		parseFloat,
	)
	.option('-o, --output <file>', 'Output file', 'concat.mp4')
	.option(
		'-p, --preset',
		`Preset to use when ffmpeg reencode (${PRESETS.join(', ')})`,
		<FFmpegPreset>'fast',
	)
	.option('--yes', 'Force overwriting existing files', false)
	.option('--print', 'Print the ffmpeg command instead of running', false)
	.option('--debug', 'Output debug information', false)
	.option('--verbose', 'Show ffmpeg output or not', false)
	// .option('--reencode', 'Force re-encoding even if formats match')
	.argument('[files...]', 'Input files to concatenate (optional)')
	.action(async function (files: string[], options: CommandOptions) {
		if (options.fade !== undefined && typeof options.fade === 'boolean') {
			options.fade = 0.5 // default for fade
		}

		if (!MODES.includes(options.mode)) {
			logger.error(`Invalid mode: ${options.mode}`)
			logger.error(`Available: ${MODES.join(', ')}`)
			process.exit(1)
		}
		if (!PRESETS.includes(options.preset)) {
			logger.error(`Invalid preset: ${options.preset}`)
			logger.error(`Available: ${PRESETS.join(', ')}`)
			process.exit(1)
		}

		if (files.length === 0) {
			logger.log(
				'No file were provided, using all video files in current directory.',
			)
			files = getAllVideoFiles()
		}

		// remove the output from the list of files
		files = files.filter((f) => f !== options.output)

		if (!files.length) throw new Error('No files to work with')

		const manager = new VideosManager(files, {debug: options.debug})

		switch (options.mode) {
			case 'demux-copy':
				try {
					await demuxCopy(manager, options)
				} catch (err) {}
				break

			// case 'demux-reenc':
			// 	try {
			// 		await demuxReenc(manager, options)
			// 	} catch (err) {}
			// 	break
			//
			// case 'reenc-demux-copy':
			// 	// I will try later
			// 	break

			case 'filter':
				await filterComplex(manager, options)
				break
		}

		// const highestVideo = (await manager.getHighestDimensionVideo())!
		// const highestDimensions = (await highestVideo.info()).dimensions
	})

program.parse(process.argv)
