import {type Logger} from '@vdegenne/debug'
import {Command} from 'commander'
import {PRESETS} from '../constants.js'
import {getAllVideoFiles} from '../utils.js'

type Action = (this: Command, ...args: any[]) => void | Promise<void>

export function fftool(
	name: string,
	description: string,
	version = '1.0.0',
	logger: Logger,
) {
	const program = new Command()

	const _action = program.action.bind(program)
	program.action = function (fn: Action) {
		return _action((files: string[], options: SharedOptions) => {
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

			if (!files.length) {
				logger.error('No videos to work with.')
				process.exit(1)
			}
			fn.call(program, files, options)
		})
	}

	return program
		.name(name)
		.description(description)
		.version(version)
		.option('-o, --output <file>', 'output file', 'output.mp4')
		.option(
			'-p, --preset <preset>',
			`preset to use when ffmpeg reencode (${PRESETS.join(', ')})`,
			<FFmpegPreset>'fast',
		)
		.option('--yes', 'force overwriting existing files', false)
		.option('--print', 'print the ffmpeg command instead of running', false)
		.option('--debug', 'output debug information', false)
		.option('--verbose', 'show ffmpeg output or not', false)

		.argument(
			'[files...]',
			'input files, order matters (optional, default to all video files in cwd)',
		)
}
