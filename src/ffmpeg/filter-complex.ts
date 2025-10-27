import {ensureOverwrite} from '../utils.js'
import {type VideosManager} from '../VideosManager.js'
import {ffmpeg} from './ffmpeg.js'

let index = 0
const videoFilter =
	`[{I}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p[vid{I}];` +
	`color=c=black:s={WIDTH}x{HEIGHT}:d={DURATION}[bg{I}];` +
	`[bg{I}][vid{I}]overlay=(W-w)/2:(H-h)/2[v{I}]`
function createVideoFilter(info: FFmpegInfo) {
	const filter = videoFilter.replaceAll('{I}', index+'')
	...
	index++
		return filter
}

/**
 * (recommended)
 * Uses ffmpeg `-filter_complex` option to concatenate all files without making reencoded temp files.
 * It will decode all input videos, and use `-filter_complex` (`-vf`) to create a final matrix, then encode it using the given codecs.
 * This works great because it will scale smaller videos to fit the greatest dimension and add black borders around.
 */
export async function filterComplex(
	manager: VideosManager,
	options: CommandOptions,
): Promise<void> {
	if (options.debug) {
		await manager.load()
	}

	// Get the highest resolution among videos
	const highestVideo = await manager.getHighestDimensionVideo()
	const [width, height] = (await highestVideo!.info()).dimensions

	// Get all videos to concatenate
	const videos = await manager.filter(() => true)
	if (videos.length === 0) throw new Error('No videos to process')

	const inputs: string[] = []
	const filters: string[] = []

	for (let i = 0; i < videos.length; ++i) {
		const video = videos[i]!
		const info = await video.info()
		inputs.push(`-i "${video.filepath}"`)

		// Scale video to fit canvas, keep aspect ratio
		filters.push(
			`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p[vid${i}];` +
				`color=c=black:s=${width}x${height}:d=${info.duration}[bg${i}];` +
				`[bg${i}][vid${i}]overlay=(W-w)/2:(H-h)/2[v${i}]`,
		)

		// Audio
		if (info.audio) {
			filters.push(
				`[${i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${i}]`,
			)
		} else {
			filters.push(`aevalsrc=0:d=${info.duration}[a${i}]`)
		}
	}

	// Concat all videos and audios
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
