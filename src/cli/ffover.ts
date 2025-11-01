import {Logger} from '@vdegenne/debug'
import chalk from 'chalk'
import {demuxCopy} from '../ffmpeg/ffconcat/demux-copy.js'
import {concatFilterComplex} from '../ffmpeg/ffconcat/filter-complex.js'
import {VideosManager} from '../VideosManager.js'
import {fftool} from './shared.js'
import {overlayFilterComplex} from '../ffmpeg/ffover/filter-complex.js'

const logger = new Logger({
	prefix: 'FFOVER',
	force: true,
	color: chalk.yellow,
	errorColor: chalk.red,
})

fftool('ffover', 'Overlay a video onto another', '1.0.0', logger)
	.action(async function (files: string[], options: ConcatOptions) {
		const manager = new VideosManager(files, {debug: options.debug})

		overlayFilterComplex(manager, options)
	})
	.parse(process.argv)
