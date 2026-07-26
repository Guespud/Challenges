import { getDb, searchNotes } from '../db';

export function runSearch(keyword: string): void {
  try {
    const db = getDb();
    const notes = searchNotes(db, keyword);
    if (notes.length === 0) {
      console.log(`No se encontraron notas con "${keyword}".`);
      return;
    }
    for (const note of notes) {
      const tagsStr = note.tags.length > 0 ? note.tags.join(', ') : 'sin tags';
      console.log(`#${note.id} [${tagsStr}] ${note.text} (${note.created_at})`);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
