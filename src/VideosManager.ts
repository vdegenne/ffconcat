import {Logger} from '@vdegenne/debug'
import chalk from 'chalk'
import {writeFile} from 'fs/promises'
import {TEMP_CONCAT_DEMUXER_FILENAME} from './constants.js'
import {Video} from './Video.js'

const logger = new Logger({
	force: true,
	color: chalk.blueBright,
	errorColor: chalk.red,
})

interface VideosManagerOptions {
	/** @default false */
	preload: boolean
	/** @default false */
	debug: boolean
}

export class VideosManager {
	#options: VideosManagerOptions
	#videos: Video[]

	loadingComplete?: Promise<FFmpegInfo[]>

	getVideos() {
		return this.#videos
	}

	constructor(filepaths: string[], options?: Partial<VideosManagerOptions>) {
		logger.log('constructing manager')
		this.#options = {
			preload: false,
			debug: false,
			...options,
		}
		this.#videos = filepaths.map((f) => new Video(f))
		if (this.#options.preload) {
			this.load()
		}
	}

	load() {
		if (!this.loadingComplete) {
			const start = Date.now()

			this.loadingComplete = Promise.all(
				this.#videos.map((v) => v.info()),
			).then((infos) => {
				const duration = Date.now() - start
				logger.log(`Loaded ${this.#videos.length} videos in ${duration}ms`)
				if (this.#options.debug) {
					this.#videos.forEach(async (v, i) => {
						logger.log(
							`[#${i}] ${v.filepath} (${JSON.stringify(await v.info())})`,
						)
					})
				}
				return infos
			})
		}
		return this.loadingComplete
	}

	async getHighestDimensionVideo(): Promise<Video | undefined> {
		if (this.#videos.length === 0) return undefined

		await this.load() // ensure all info is loaded

		let maxVideo: Video | undefined
		let maxArea = 0

		for (const video of this.#videos) {
			const info = await video.info() // safe access
			const [width, height] = info.dimensions
			const area = width * height
			if (area > maxArea) {
				maxArea = area
				maxVideo = video
			}
		}

		return maxVideo
	}

	async getSmallestDimensionVideo(): Promise<Video | undefined> {
		if (this.#videos.length === 0) return undefined

		await this.load() // ensure all info is loaded

		let minVideo: Video | undefined
		let minArea = Infinity

		for (const video of this.#videos) {
			const info = await video.info() // safe access
			const [width, height] = info.dimensions
			const area = width * height
			if (area < minArea) {
				minArea = area
				minVideo = video
			}
		}

		return minVideo
	}

	/**
	 * Create a concat demuxer file for ffmpeg.
	 * Optionally filters videos by FFmpegInfo.
	 */
	async createConcatDemuxerFile(filter?: FilterFunction): Promise<string> {
		let videosToConcat = this.#videos

		if (filter) {
			videosToConcat = await this.filter(filter)
		}

		if (videosToConcat.length === 0) {
			throw new Error('No videos to concatenate after filtering')
		}

		const lines = videosToConcat.map(
			(v) => `file '${v.filepath.replace(/'/g, "'\\''")}'`,
		)

		await writeFile(TEMP_CONCAT_DEMUXER_FILENAME, lines.join('\n'), 'utf-8')

		logger.log(`"${TEMP_CONCAT_DEMUXER_FILENAME}" created`)

		return TEMP_CONCAT_DEMUXER_FILENAME
	}

	/**
	 * Filter videos by properties of FFmpegInfo
	 * @returns Array of videos matching the filter
	 */
	async filter(fn: FilterFunction): Promise<Video[]> {
		const result: Video[] = []

		for (const video of this.#videos) {
			const info = await video.info()
			if (fn(info)) result.push(video)
		}

		if (this.#options.debug) {
			// calculate total duration
			const totalSeconds = (
				await Promise.all(result.map((v) => v.info()))
			).reduce((sum, info) => sum + info.duration, 0)
			const hours = Math.floor(totalSeconds / 3600)
			const minutes = Math.floor((totalSeconds % 3600) / 60)
			const seconds = Math.floor(totalSeconds % 60)
			const formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
			logger.log(
				chalk.cyan(
					`[filter] ${result.length} videos, total duration: ${formattedDuration}`,
				),
			)
		}

		return result
	}
}
