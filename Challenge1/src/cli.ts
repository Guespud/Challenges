#!/usr/bin/env node
import { Command } from 'commander';
import { runAdd } from './commands/add';
import { runList } from './commands/list';
import { runSearch } from './commands/search';
import { runDelete } from './commands/delete';
import { runExport } from './commands/export';
import { runRepair } from './commands/repair';

const program = new Command();

program
  .name('nota')
  .description('CLI para gestionar notas personales con etiquetas y búsqueda')
  .version('1.0.0');

program
  .command('add <texto>')
  .description('Crea una nueva nota')
  .option('--tag <tags>', 'tags separados por coma, ej: trabajo,ideas')
  .action((texto, options) => runAdd(texto, options.tag));

program
  .command('list')
  .description('Lista todas las notas')
  .option('--tag <tag>', 'filtra por tag')
  .action((options) => runList(options.tag));

program
  .command('search <palabra>')
  .description('Busca notas que contengan la palabra')
  .action((palabra) => runSearch(palabra));

program
  .command('delete <id>')
  .description('Elimina una nota por su id')
  .action((id) => runDelete(id));

program
  .command('export')
  .description('Exporta todas las notas a un archivo')
  .requiredOption('--format <format>', 'formato de exportación: json o md')
  .action((options) => runExport(options.format));

program
  .command('repair')
  .description('Regenera la base de datos si está corrupta')
  .action(() => runRepair());

program.parse();