import { repairDb } from '../db';
import path from 'path';

export function runRepair(): void {
  try {
    repairDb(path.join(process.cwd(), 'notas.db'));
  } catch (err) {
    console.error(`Error: no se pudo reparar la base de datos: ${(err as Error).message}`);
    process.exit(1);
  }
}
