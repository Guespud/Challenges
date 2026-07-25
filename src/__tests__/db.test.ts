import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { getDb, addNote, listNotes, searchNotes, deleteNote, exportNotes } from '../db';

describe('db', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDb(':memory:');
  });

  it('agrega una nota y la devuelve con id', () => {
    const note = addNote(db, 'Comprar leche', ['hogar']);
    expect(note.id).toBeGreaterThan(0);
    expect(note.text).toBe('Comprar leche');
    expect(note.tags).toEqual(['hogar']);
  });

  it('rechaza texto vacío', () => {
    expect(() => addNote(db, '', [])).toThrow('no puede estar vacío');
  });

  it('lista notas ordenadas por fecha descendente', () => {
    addNote(db, 'Primera', []);
    addNote(db, 'Segunda', []);
    const notes = listNotes(db);
    expect(notes[0].text).toBe('Segunda');
  });

  it('filtra por tag', () => {
    addNote(db, 'Nota trabajo', ['trabajo']);
    addNote(db, 'Nota personal', ['personal']);
    const notes = listNotes(db, 'trabajo');
    expect(notes).toHaveLength(1);
  });

  it('busca por palabra clave', () => {
    addNote(db, 'Reunión con cliente', []);
    addNote(db, 'Comprar pan', []);
    const results = searchNotes(db, 'cliente');
    expect(results).toHaveLength(1);
  });

  it('borra una nota existente', () => {
    const note = addNote(db, 'Temporal', []);
    expect(() => deleteNote(db, note.id)).not.toThrow();
    expect(listNotes(db)).toHaveLength(0);
  });

  it('lanza error al borrar id inexistente', () => {
    expect(() => deleteNote(db, 999)).toThrow('No existe una nota con id 999');
  });

  it('exporta a JSON', () => {
    addNote(db, 'Nota json', []);
    const output = exportNotes(db, 'json');
    expect(JSON.parse(output)).toHaveLength(1);
  });
});
