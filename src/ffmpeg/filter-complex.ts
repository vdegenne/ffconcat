import {ensureOverwrite} from '../utils.js'
import {type VideosManager} from '../VideosManager.js'
import {ffmpeg} from './ffmpeg.js'

let index = 0
const filterTemplate =
	// video
	`[{I}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p[vid{I}];` +
	// black background for borders
	`color=c=black:s={WIDTH}x{HEIGHT}:d={DURATION}[bg{I}];` +
	// assemble
	`[bg{I}][vid{I}]overlay=(W-w)/2:(H-h)/2[v{I}];` +
	// audio
	`[{I}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a{I}]`

function createFilter(info: FFmpegInfo) {
	const filter = filterTemplate
		.replaceAll('{I}', index + '')
		.replaceAll('{WIDTH}', info.dimensions[0] + '')
		.replaceAll('{HEIGHT}', info.dimensions[1] + '')
		.replaceAll('{DURATION}', info.duration + '')
	index++
	return filter
}

/**
 * (recommended)
 * Uses ffmpeg -filter_complex option to concatenate all files without making reencoded temp files.
 * It will decode all input videos, and use -filter_complex (-vf) to create a final matrix, then encode it using the given codecs.
 * This works great because it will scale smaller videos to fit the greatest dimension and add black borders around.
 */
export async function filterComplex(
	manager: VideosManager,
	options: CommandOptions,
): Promise<void> {
	if (options.debug) {
		await manager.load()
	}

	const highestVideo = await manager.getHighestDimensionVideo()
	const [width, height] = (await highestVideo!.info()).dimensions

	const videos = await manager.filter(() => true)
	if (!videos.length) throw new Error('No videos to process')

	const inputs: string[] = []
	const filters: string[] = []

	for (const video of videos) {
		const info = await video.info()
		inputs.push(`-i "${video.filepath}"`)

		// Generate video filter
		filters.push(
			createFilter({
				...info,
				dimensions: [width, height],
			}),
		)

		// If no audio, insert silence (FFmpeg pads automatically)
		if (!info.audio) {
			filters.push(`aevalsrc=0:d=${info.duration}[a${index - 1}]`)
		}
	}

	// Concat all video & audio streams
	const concatFilter = [
		filters.join(';'),
		`${videos.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${videos.length}:v=1:a=1[outv][outa]`,
	].join(';')

	const cmd = [
		...inputs,
		'-filter_complex',
		`"${concatFilter}"`,
		'-map',
		'[outv]',
		'-map',
		'[outa]',
		'-c:v',
		'libx264',
		'-preset',
		'ultrafast',
		'-crf',
		'23',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		`"${options.output}"`,
	].join(' ')

	await ensureOverwrite(options.output, options)
	await ffmpeg(cmd, options)
}
