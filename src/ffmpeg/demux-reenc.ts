import {TEMP_CONCAT_DEMUXER_FILENAME} from '../constants.js'
import {ensureOverwrite} from '../utils.js'
import {type VideosManager} from '../VideosManager.js'
import {ffmpeg} from './ffmpeg.js'

export async function demuxReenc(
	manager: VideosManager,
	options: CommandOptions,
): Promise<void> {
	if (options.debug) {
		await manager.load()
	}

	// 1. Create the concat demuxer file
	await ensureOverwrite(TEMP_CONCAT_DEMUXER_FILENAME, options)
	const listFile = await manager.createConcatDemuxerFile(
		(info) => info.framerate === 60,
	)

	const highestVideo = await manager.getHighestDimensionVideo()
	const [width, height] = (await highestVideo!.info()).dimensions

	// 2. Overwrite output if needed
	await ensureOverwrite(options.output, options)

	// 3. Build the real FFmpeg command string
	const cmd = [
		'-f concat',
		'-safe 0',
		'-fflags +genpts',
		`-i ${listFile}`,
		'-avoid_negative_ts make_zero',
		'-vsync 2',
		// '-r 60',
		'-fps_mode vfr',
		'-c:v libx264',
		'-preset ultrafast',
		'-crf 23',
		`-vf scale=${width}:${height}`,
		'-pix_fmt yuv420p',
		'-c:a aac',
		'-b:a 192k',
		`${options.output}`,
	].join(' ')

	console.log('FFmpeg command:', `ffmpeg ${cmd}`)
	await ffmpeg(cmd)
	console.log(`Videos concatenated successfully into ${options.output}`)
}
