// How a workbook starts, kept apart from the reader so that checking costs nothing to load.

const ZIP = [0x50, 0x4b, 0x03, 0x04]
// Old .xls files, and .xlsx files with a password, are OLE compound files.
export const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

export const startsWith = (bytes: Uint8Array, magic: number[]) =>
	magic.every((byte, i) => bytes[i] === byte)

export const isSpreadsheet = (bytes: Uint8Array) => startsWith(bytes, ZIP) || startsWith(bytes, OLE)
