import { getDb, listNotes } from '../db';

export function runList(tagFilter?: string): void {
  try {
    const db = getDb();
    const notes = listNotes(db, tagFilter);
    if (notes.length === 0) {
      console.log('No hay notas guardadas.');
      return;
    }
    for (const note of notes) {
      const preview = note.text.length > 50 ? note.text.slice(0, 50) + '...' : note.text;
      const tagsStr = note.tags.length > 0 ? note.tags.join(', ') : 'sin tags';
      console.log(`#${note.id} [${tagsStr}] ${preview} (${note.created_at})`);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
