export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv']
export const TEMP_DIRECTORY_NAME = 'reencoded_clips'
export const TEMP_CONCAT_DEMUXER_FILENAME = 'list.txt'

export const MODES = [
	'demux-copy',
	'demux-reenc',
	'reenc-demux-copy',
	'filter-complex',
] as const
true as AllValuesPresent<ConcatMode, typeof MODES>
