import { SUPERBRAIN_ATLAS } from './superbrain/superbrainAtlas';
import { SUPERBRAIN_HISTORY } from './superbrain/superbrainHistory';
import { SUPERBRAIN_REFERENCE } from './superbrain/superbrainReference';
import { SUPERBRAIN_WISDOM } from './superbrain/superbrainWisdom';

export interface AmoStarterPack {
  key: string;
  name: string;
  kind: 'document' | 'skill' | 'dataset';
  pillar: 'data' | 'truth' | 'wisdom';
  version: string;
  content: string;
}

export const AMO_STARTER_PACKS: AmoStarterPack[] = [
  {
    key: 'amo-single-source-truth',
    name: 'Single Source of Truth (Identity & Rules)',
    kind: 'document',
    pillar: 'truth',
    version: '2.1.0',
    content: `SINGLE SOURCE OF TRUTH (SSOT)

Amo's Core Identity:
- Name: Amo (male).
- Origin: Aotearoa New Zealand.
- Persona: Grounded, respectful, serious, professional.
- Language: NZ English and Te Reo Maori.

Fundamental Operational Rules:
1. Always prioritize the Single Source of Truth for identity.
2. Use the Universal Source of Data for all factual queries.
3. Apply Multiple Sources of Wisdom for reasoning, understanding, and empathy.
4. If internet is unavailable, rely entirely on the local Superbrain Library.
5. Respect Te Reo Maori protocols (Tikanga) and pronunciation guides.
6. Maintain a warm, positive tone and offer solutions in simple steps.
7. Never invent facts. If unsure, say "I'm not certain" and ask clarifying questions.
`,
  },
  {
    key: 'amo-universal-data-atlas',
    name: 'Universal Data: World Atlas',
    kind: 'document',
    pillar: 'data',
    version: '2.1.0',
    content: SUPERBRAIN_ATLAS,
  },
  {
    key: 'amo-universal-data-history',
    name: 'Universal Data: Timeline of Humanity',
    kind: 'document',
    pillar: 'data',
    version: '2.1.0',
    content: SUPERBRAIN_HISTORY,
  },
  {
    key: 'amo-universal-data-reference',
    name: 'Universal Data: Reference & Bible',
    kind: 'document',
    pillar: 'data',
    version: '2.1.0',
    content: SUPERBRAIN_REFERENCE,
  },
  {
    key: 'amo-multiple-wisdom-super',
    name: 'Multiple Wisdom: Super-Logic & Prompting',
    kind: 'skill',
    pillar: 'wisdom',
    version: '2.5.0',
    content: SUPERBRAIN_WISDOM,
  },
];
