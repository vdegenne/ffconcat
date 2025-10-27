import ffmpeg from 'fluent-ffmpeg'

export class Video {
	#info: FFmpegInfo | undefined

	constructor(public filepath: string) {}

	async info(): Promise<FFmpegInfo> {
		if (this.#info) return this.#info

		return new Promise((resolve, reject) => {
			ffmpeg.ffprobe(this.filepath, (err, metadata) => {
				if (err) return reject(err)

				const videoStream = metadata.streams.find(
					(s) => s.codec_type === 'video',
				)
				if (!videoStream) return reject(new Error('No video stream found'))

				const width = videoStream.width ?? 0
				const height = videoStream.height ?? 0
				const dimensions: [number, number] = [width, height]

				const duration = metadata.format.duration ?? 0

				let framerate = 0
				if (videoStream.r_frame_rate) {
					const parts = videoStream.r_frame_rate.split('/')
					const num = Number(parts[0]) || 0
					const den = Number(parts[1]) || 1
					framerate = num / den
				}

				// Check if there is at least one audio stream
				const audioStream = metadata.streams.find(
					(s) => s.codec_type === 'audio',
				)
				const hasAudio = !!audioStream

				this.#info = {dimensions, duration, framerate, audio: hasAudio}
				resolve(this.#info)
			})
		})
	}
}
