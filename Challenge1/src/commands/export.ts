import { getDb, exportNotes } from '../db';
import fs from 'fs';
import path from 'path';

export function runExport(format: string): void {
  try {
    if (format !== 'json' && format !== 'md') {
      console.error('Error: formato no soportado. Usa "json" o "md".');
      process.exit(1);
    }
    const db = getDb();
    const content = exportNotes(db, format as 'json' | 'md');
    const filename = `notas.${format}`;
    fs.writeFileSync(path.join(process.cwd(), filename), content, 'utf-8');
    console.log(`Notas exportadas a ${filename}`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
