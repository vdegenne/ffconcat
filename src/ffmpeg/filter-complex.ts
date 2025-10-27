import {ensureOverwrite} from '../utils.js'
import {type VideosManager} from '../VideosManager.js'
import {ffmpeg} from './ffmpeg.js'

let index = 0

const TEMPLATES = {
	video:
		'[{I}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p[vid{I}];' +
		'color=c=black:s={WIDTH}x{HEIGHT}:d={DURATION}[bg{I}];' +
		'[bg{I}][vid{I}]overlay=(W-w)/2:(H-h)/2[v{I}];' +
		'{AUDIO}',

	audio:
		'[{I}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a{I}]',

	silence: 'aevalsrc=0:d={DURATION}[a{I}]',

	concat: '{LIST}concat=n={SIZE}:v=1:a=1[outv][outa]',
}

function createFilter(info: FFmpegInfo) {
	const atemplate = info.audio ? TEMPLATES.audio : TEMPLATES.silence
	const afilter = atemplate
		.replaceAll('{I}', index + '')
		.replaceAll('{DURATION}', info.duration + '')

	const vfilter = TEMPLATES.video
		.replaceAll('{I}', index + '')
		.replaceAll('{WIDTH}', info.dimensions[0] + '')
		.replaceAll('{HEIGHT}', info.dimensions[1] + '')
		.replaceAll('{DURATION}', info.duration + '')
		.replaceAll('{AUDIO}', afilter)

	index++
	return vfilter
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
	const highestVideo = await manager.getHighestDimensionVideo()
	const [width, height] = (await highestVideo!.info()).dimensions

	const videos = manager.getVideos()
	if (!videos.length) throw new Error('No videos to process')

	const inputs: string[] = []
	const filters: string[] = []

	for (const video of videos) {
		const info = await video.info()
		inputs.push(`-i "${video.filepath}"`)

		filters.push(
			createFilter({
				...info,
				dimensions: [width, height],
			}),
		)
	}

	const concatFilter = TEMPLATES.concat
		.replaceAll('{LIST}', videos.map((_, i) => `[v${i}][a${i}]`).join(''))
		.replaceAll('{SIZE}', videos.length + '')

	const finalConcatFilter = `${filters.join(';')};${concatFilter}`

	const cmd = [
		...inputs,
		`-filter_complex "${finalConcatFilter}"`,
		'-map [outv]',
		'-map [outa]',
		'-c:v libx264',
		'-preset ultrafast',
		'-crf 23',
		'-pix_fmt yuv420p',
		'-c:a aac',
		'-b:a 192k',
		`"${options.output}"`,
	]

	if (!options.print) {
		await ensureOverwrite(options.output, options)
	}
	await ffmpeg(cmd, options)
}
