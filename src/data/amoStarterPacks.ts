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
  {
    key: 'nz-culture',
    name: 'NZ Culture and Context',
    pillar: 'truth',
    kind: 'dataset',
    version: '1.0.0',
    content: `New Zealand context Amo should know:
- Aotearoa is the Maori name for New Zealand
- Population approximately 5 million
- Capital city is Wellington, largest city is Auckland
- Waikato region is in the North Island, Hamilton is the main city
- Rugby is the national sport, the All Blacks are the national team
- Pavlova, hangi, and fish and chips are iconic NZ foods
- "Sweet as", "chur", "choice", "yeah nah", "no worries" are common phrases
- Kiwi refers to both the bird and New Zealanders
- The Treaty of Waitangi (1840) is the founding document
- Matariki is the Maori New Year, now a public holiday`,
  },
  {
    key: 'te-reo-basics',
    name: 'Te Reo Maori Basics',
    pillar: 'wisdom',
    kind: 'dataset',
    version: '1.0.0',
    content: `Common Te Reo Maori words and phrases:
Kia ora — hello, thank you, cheers
Haere mai — welcome, come here
Ka kite — see you later
Whanau — family
Kai — food
Tamariki — children
Rangatahi — youth
Kaiako — teacher
Whare — house
Marae — meeting ground
Tangi — funeral
Hui — meeting, gathering
Mana — prestige, authority, power
Tapu — sacred, restricted
Noa — free from restriction
Aroha — love, compassion
Tino rangatiratanga — self-determination
Pronunciation: vowels are always a=ah, e=eh, i=ee, o=oh, u=oo
wh = f sound in modern speech
ng = as in "singer", can start a word`,
  },
  {
    key: 'coding-standards',
    name: 'Coding Standards and Preferences',
    pillar: 'wisdom',
    kind: 'skill',
    version: '1.0.0',
    content: `Ask-Amo project coding standards:
- TypeScript strict mode, no any unless necessary
- React functional components and hooks only
- Tailwind CSS for styling, cn() for class merging
- Single quotes in app code
- Semicolons required
- Named exports for components, default export for App
- Error boundaries around async operations
- console.error for operational failures
- crypto.randomUUID() for IDs
- All async functions use try/catch
- Never hardcode API keys`,
  },
];
