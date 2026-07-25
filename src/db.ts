import Database from 'better-sqlite3';
import path from 'path';

export interface Note {
  id: number;
  text: string;
  tags: string[];
  created_at: string;
}

interface NoteRow {
  id: number;
  text: string;
  tags: string;
  created_at: string;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    text: row.text,
    tags: row.tags ? row.tags.split(',') : [],
    created_at: row.created_at,
  };
}

export class DbCorruptedError extends Error {
  constructor() {
    super('La base de datos está corrupta o inaccesible. Ejecuta "nota repair" para regenerarla.');
    this.name = 'DbCorruptedError';
  }
}

export function getDb(dbPath: string = path.join(process.cwd(), 'notas.db')): Database.Database {
  let db: Database.Database;
  try {
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        tags TEXT,
        created_at TEXT NOT NULL
      )
    `);
  } catch (err) {
    throw new DbCorruptedError();
  }
  return db;
}

export function repairDb(dbPath: string = path.join(process.cwd(), 'notas.db')): void {
  const fs = require('fs');
  if (fs.existsSync(dbPath)) {
    const backupPath = `${dbPath}.corrupted-${Date.now()}.bak`;
    fs.renameSync(dbPath, backupPath);
    console.log(`Base de datos corrupta respaldada en: ${backupPath}`);
  }
  getDb(dbPath);
  console.log('Base de datos regenerada correctamente.');
}

export function addNote(db: Database.Database, text: string, tags: string[]): Note {
  if (!text || text.trim().length === 0) {
    throw new Error('El texto de la nota no puede estar vacío.');
  }
  const created_at = new Date().toISOString();
  const tagsStr = tags.join(',');
  const stmt = db.prepare('INSERT INTO notes (text, tags, created_at) VALUES (?, ?, ?)');
  const result = stmt.run(text, tagsStr, created_at);
  return { id: Number(result.lastInsertRowid), text, tags, created_at };
}

export function listNotes(db: Database.Database, tagFilter?: string): Note[] {
  let rows: NoteRow[];
  if (tagFilter) {
    rows = db
      .prepare('SELECT * FROM notes WHERE tags LIKE ? ORDER BY created_at DESC, id DESC')
      .all(`%${tagFilter}%`) as NoteRow[];
  } else {
    rows = db.prepare('SELECT * FROM notes ORDER BY created_at DESC, id DESC').all() as NoteRow[];
  }
  return rows.map(rowToNote);
}

export function searchNotes(db: Database.Database, keyword: string): Note[] {
  const rows = db
    .prepare('SELECT * FROM notes WHERE text LIKE ? ORDER BY created_at DESC')
    .all(`%${keyword}%`) as NoteRow[];
  return rows.map(rowToNote);
}

export function deleteNote(db: Database.Database, id: number): void {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`No existe una nota con id ${id}.`);
  }
}

export function exportNotes(db: Database.Database, format: 'json' | 'md'): string {
  const notes = listNotes(db);
  if (format === 'json') {
    return JSON.stringify(notes, null, 2);
  }
  return notes
    .map((n) => `- **#${n.id}** (${n.tags.join(', ') || 'sin tags'}): ${n.text}`)
    .join('\n');
}
