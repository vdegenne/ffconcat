import ffmpeg from 'fluent-ffmpeg'
import {TEMP_CONCAT_DEMUXER_FILENAME} from '../constants.js'
import {ensureOverwrite} from '../utils.js'
import {type VideosManager} from '../VideosManager.js'

export async function demuxCopy(
	manager: VideosManager,
	options: CommandOptions,
): Promise<void> {
	if (options.debug) {
		await manager.load()
	}

	// 1. Create the concat demuxer file
	options.yes || (await ensureOverwrite(TEMP_CONCAT_DEMUXER_FILENAME))
	const listFile = await manager.createConcatDemuxerFile((info) => {
		if (info.framerate !== 60) {
			return false
		}
		return true
	})

	// 2. Run FFmpeg using fluent-ffmpeg
	options.yes || (await ensureOverwrite(options.output))
	return new Promise((resolve, reject) => {
		ffmpeg()
			.input(listFile)
			.inputOptions(['-f concat', '-safe 0'])
			.outputOptions(['-c copy'])
			.output(options.output)
			.on('start', (cmd) => {
				console.log('FFmpeg command:', cmd)
			})
			.on('error', (err) => {
				console.error('FFmpeg error:', err)
				reject(err)
			})
			.on('end', () => {
				console.log(`Videos concatenated successfully into ${options.output}`)
				resolve()
			})
			.run()
	})
}
