const fs = require('fs');
const path = require('path');

const INPUT_DIR = process.argv[2] || 'knowledge-inputs';
const OUTPUT_FILE = path.resolve('src/data/curatedKnowledge.ts');
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown'];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function collectFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFiles(entryPath);
      files.push(...nested);
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
  try {
    await fs.promises.access(inputPath);
  } catch {
    throw new Error(`Input directory "${inputPath}" does not exist.`);
  }

  const files = await collectFiles(inputPath);
  files.sort();

  const packs = [];
  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const relative = path.relative(inputPath, filePath);
    const title = relative.replace(/\\/g, '/');
    const key = `curated-${slugify(title)}-${index}`;
    packs.push({
      key,
      name: path.basename(title),
      description: `Imported from ${title}`,
      kind: 'document',
      pillar: 'data',
      version: '1.0.0',
      content: raw.trim() || ' ',
    });
  }

  return packs;
}

function formatModule(packs) {
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
  await fs.promises.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.promises.writeFile(OUTPUT_FILE, formatModule(packs), 'utf-8');
  console.info(`Imported ${packs.length} files into ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
