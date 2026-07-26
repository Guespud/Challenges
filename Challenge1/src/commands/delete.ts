import { getDb, deleteNote } from '../db';

export function runDelete(idString: string): void {
  try {
    const id = parseInt(idString, 10);
    if (isNaN(id)) {
      console.error('Error: el id debe ser un número.');
      process.exit(1);
    }
    const db = getDb();
    deleteNote(db, id);
    console.log(`Nota #${id} eliminada.`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
