import { promises as fs } from 'fs';
import path from 'path';

const INPUT_DIR = process.argv[2] || 'knowledge-inputs';
const OUTPUT_FILE = path.resolve('src/data/curatedKnowledge.ts');

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown'];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function collectFiles(directory: string) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    if (SUPPORTED_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

async function buildPacks() {
  const inputPath = path.resolve(INPUT_DIR);
  const dirExists = await fs.stat(inputPath).catch(() => null);
  if (!dirExists) {
    throw new Error(`Input directory "${inputPath}" does not exist.`);
  }

  const files = await collectFiles(inputPath);
  files.sort();

  const packs = await Promise.all(
    files.map(async (filePath, index) => {
      const raw = await fs.readFile(filePath, 'utf-8');
      const relative = path.relative(inputPath, filePath);
      const title = relative.replace(/\\/g, '/');
      const key = `curated-${slugify(title)}-${index}`;
      return {
        key,
        name: path.basename(title),
        description: `Imported from ${title}`,
        kind: 'document',
        pillar: 'data',
        version: '1.0.0',
        content: raw.trim() || ' ',
      };
    })
  );

  return packs;
}

function formatModule(packs: Array<Record<string, unknown>>) {
  const content = JSON.stringify(packs, null, 2);
  return `export interface CuratedKnowledgePack {
  key: string;
  name: string;
  description?: string;
  kind: 'document' | 'skill' | 'dataset';
  pillar: 'data' | 'truth' | 'wisdom' | 'culture' | 'science';
  version: string;
  content: string;
}

export const CURATED_KNOWLEDGE_PACKS: CuratedKnowledgePack[] = ${content};
`;
}

async function main() {
  const packs = await buildPacks();
  const moduleText = formatModule(packs);
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, moduleText, 'utf-8');
  console.info(`Imported ${packs.length} files into ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
