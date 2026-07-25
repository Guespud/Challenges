import { getDb, addNote } from '../db';

export function runAdd(text: string, tagString?: string): void {
  try {
    const db = getDb();
    const tags = tagString ? tagString.split(',').map((t) => t.trim()) : [];
    const note = addNote(db, text, tags);
    console.log(`Nota #${note.id} creada.`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
