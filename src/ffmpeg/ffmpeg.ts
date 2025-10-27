import {Logger} from '@vdegenne/debug'
import chalk from 'chalk'
import {spawn} from 'node:child_process'

const logger = new Logger({color: chalk.blue, alwaysLog: true})

interface FFmpegOptions {
	/** @default false */
	verbose: boolean

	/**
	 * Just prints do not run
	 */
	print: boolean
}

export function ffmpeg(
	cmd: string | string[],
	options?: Partial<FFmpegOptions>,
): Promise<void> {
	const _opts: FFmpegOptions = {
		verbose: false,
		print: false,
		...options,
	}
	return new Promise((resolve, reject) => {
		// Join array if needed
		const command = Array.isArray(cmd) ? cmd.join(' ') : cmd

		// Remove leading 'ffmpeg ' if it exists
		let finalCommand = command.replace(/^ffmpeg\s+/, '')

		// Prepend loglevel flags if verbose is false
		if (_opts.print) {
			_opts.verbose = true
		}
		if (!_opts.verbose) {
			finalCommand = `-hide_banner -loglevel error ${finalCommand}`
		}

		logger.log('======== command =================')
		console.log(`ffmpeg ${finalCommand}`)
		logger.log('==================================')

		if (_opts.print) {
			return
		}

		// Run the entire command as-is via shell
		const proc = spawn('sh', ['-c', `ffmpeg ${finalCommand}`], {
			stdio: 'inherit',
		})
		logger.log(chalk.blue('Please wait...'))
		proc.on('error', reject)
		proc.on('close', (code) => {
			if (code === 0) {
				logger.log('ffmpeg command success')
				resolve()
			} else reject(new Error(`ffmpeg exited with code ${code}`))
		})
	})
}
