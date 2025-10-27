export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv']
export const TEMP_DIRECTORY_NAME = 'reencoded_clips'
export const TEMP_CONCAT_DEMUXER_FILENAME = 'list.txt'

export const MODES = [
	'demux-copy',
	'filter',
	// 'demux-reenc',
	// 'reenc-demux-copy',
] as const
true as AllValuesPresent<ConcatMode, typeof MODES>

export const PRESETS = [
	'ultrafast',
	'superfast',
	'veryfast',
	'faster',
	'fast',
	'medium',
	'slow',
	'slower',
	'veryslow',
	'placebo',
] as const
true as AllValuesPresent<FFmpegPreset, typeof PRESETS>
