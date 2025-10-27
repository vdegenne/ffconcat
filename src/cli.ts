import {Logger} from '@vdegenne/debug'
import chalk from 'chalk'
import {Command} from 'commander'
import {MODES} from './constants.js'
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
	.option('-o, --output <file>', 'Output file', 'output.mp4')
	.option('--yes', 'Force overwriting existing files', false)
	.option('--debug', 'Output debug information', false)
	.option('--verbose', 'Show ffmpeg output or not', false)
	// .option('--reencode', 'Force re-encoding even if formats match')
	.argument('[files...]', 'Input files to concatenate (optional)')
	.action(async function (files: string[], options: CommandOptions) {
		const {debug, mode} = options

		if (!MODES.includes(mode)) {
			logger.error(`Invalid mode: ${mode}`)
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

		const manager = new VideosManager(files, {debug})

		switch (options.mode) {
			case 'demux-copy':
				try {
					await demuxCopy(manager, options)
				} catch (err) {}
				break

			case 'demux-reenc':
				try {
					await demuxReenc(manager, options)
				} catch (err) {}
				break

			case 'reenc-demux-copy':
				// I will try later
				break

			case 'filter-complex':
				await filterComplex(manager, options)
				break
		}

		// const highestVideo = (await manager.getHighestDimensionVideo())!
		// const highestDimensions = (await highestVideo.info()).dimensions
	})

program.parse(process.argv)
