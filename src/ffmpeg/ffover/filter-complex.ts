import {ensureOverwrite} from '../../utils.js'
import {VideosManager} from '../../VideosManager.js'
import {ffmpeg} from '../ffmpeg.js'

const Template = {
	VIDEO:
		'[{I}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p[v{I}]' +
		'{TRANSPARENT_FILTER}',

	CHROMAKEY: '[v{I}]chromakey=0x00FF00:0.22:0.1,format=rgba[ck{I}];' + '',

	/** @deprecated */
	COLORKEY:
		'[1:v]colorkey=0x00FF00:0.2:0.1[ckout];[0:v][ckout]overlay=(W-w)/2:(H-h)/2',

	OVERLAY: '{LIST}??????????????[outv]',
}

let index = 0

function createFilter(info: FFmpegInfo) {
	// transparent filter (chromakey test for now)
	// first video is the background so no chromakey filter
	let tfilter = index === 0 ? '' : ';' + Template.CHROMAKEY
	tfilter = tfilter.replaceAll('{I}', index + '')

	// video
	let vfilter = Template.VIDEO.replaceAll('{I}', index + '')
		.replaceAll('{WIDTH}', info.dimensions[0] + '')
		.replaceAll('{HEIGHT}', info.dimensions[1] + '')
		.replaceAll('{TRANSPARENT_FILTER}', tfilter)

	index++

	return vfilter
}

export async function overlayFilterComplex(
	manager: VideosManager,
	options: OverlayOptions,
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
				dimensions: [width, height], // always use the greatest dimensions
			}),
		)
	}

	const concatFilter = Template.OVERLAY.replaceAll(
		'{LIST}',
		'[v0]' +
			videos
				.slice(1)
				.map((_, i) => `[vck${i + 1}]`)
				.join(''),
	)

	const finalConcatFilter = `${filters.join(';')};${concatFilter}`

	const cmd = [
		...inputs,
		`-filter_complex "${finalConcatFilter}"`,
		// '-map [outv]',
		// '-map [outa]',
		'-c:v libx264',
		`-preset ${options.preset}`,
		'-crf 23',
		'-pix_fmt yuv420p',
		// '-c:a aac',
		'-b:a 192k',
		'-c:a copy',
		`"${options.output}"`,
	]

	if (!options.print) {
		await ensureOverwrite(options.output, options)
	}
	await ffmpeg(cmd, options)
}
