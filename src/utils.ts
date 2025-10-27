import readline from 'readline'
import {access, constants, unlink} from 'fs/promises'
import {readdirSync, statSync} from 'fs'
import pathlib from 'path'
import {VIDEO_EXTENSIONS} from './constants.js'

export function getAllVideoFiles(dir = '.'): string[] {
	const entries = readdirSync(dir)
	const videoFiles: string[] = []

	for (const entry of entries) {
		const fullPath = pathlib.join(dir, entry)
		const stats = statSync(fullPath)

		if (
			stats.isFile() &&
			VIDEO_EXTENSIONS.includes(pathlib.extname(entry).toLowerCase())
		) {
			videoFiles.push(fullPath)
		}
	}

	return videoFiles
}

export function allSameExtensions(filenames: string[]): boolean {
	const exts = new Set(filenames.map((f) => pathlib.extname(f).toLowerCase()))
	return exts.size <= 1
}

/**
 * Guard function to check if a file exists and ask the user for overwrite.
 * @param filePath Path to check
 * @throws if file exists and user refuses to overwrite
 */
export async function ensureOverwrite(
	filePath: string,
	options: {yes: boolean} = {yes: false},
): Promise<void> {
	try {
		await access(filePath, constants.F_OK) // check if file exists
	} catch {
		return // file does not exist, continue
	}

	if (!options.yes) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		const answer: string = await new Promise((resolve) => {
			rl.question(`File ${filePath} already exists. Overwrite? (y/n) `, resolve)
		})

		rl.close()

		if (answer.trim().toLowerCase() !== 'y') {
			throw new Error(`Aborted: ${filePath} exists`)
		}
	}

	await unlink(filePath)
}
