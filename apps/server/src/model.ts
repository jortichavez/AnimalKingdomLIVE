export const ANIMALS = [
  { id: 'fox', name: 'Zorro', emoji: '🦊', rarity: 'comun' },
  { id: 'panda', name: 'Panda', emoji: '🐼', rarity: 'comun' },
  { id: 'lion', name: 'León', emoji: '🦁', rarity: 'comun' },
  { id: 'wolf', name: 'Lobo', emoji: '🐺', rarity: 'comun' },
  { id: 'frog', name: 'Rana', emoji: '🐸', rarity: 'comun' },
  { id: 'cat', name: 'Gato', emoji: '🐱', rarity: 'comun' },
  { id: 'bear', name: 'Oso', emoji: '🐻', rarity: 'comun' },
  { id: 'rabbit', name: 'Conejo', emoji: '🐰', rarity: 'comun' },
  { id: 'penguin', name: 'Pingüino', emoji: '🐧', rarity: 'raro' },
  { id: 'tiger', name: 'Tigre', emoji: '🐯', rarity: 'raro' },
  { id: 'unicorn', name: 'Unicornio', emoji: '🦄', rarity: 'epico' },
  { id: 'dragon', name: 'Dragón', emoji: '🐲', rarity: 'legendario' },
  { id: 'elephant', name: 'Elefante', emoji: '🐘', rarity: 'comun' },
  { id: 'monkey', name: 'Mono', emoji: '🐵', rarity: 'comun' },
  { id: 'koala', name: 'Koala', emoji: '🐨', rarity: 'raro' },
  { id: 'pug', name: 'Perro', emoji: '🐶', rarity: 'comun' },
  { id: 'hamster', name: 'Hámster', emoji: '🐹', rarity: 'comun' },
  { id: 'chick', name: 'Pollito', emoji: '🐤', rarity: 'comun' },
  { id: 'octopus', name: 'Pulpo', emoji: '🐙', rarity: 'raro' },
  { id: 'whale', name: 'Ballena', emoji: '🐳', rarity: 'epico' }
] as const;
export type AnimalId = typeof ANIMALS[number]['id'];

// Ignore accents, case, spaces and common separators in chat commands.
export function normalizeAnimalText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[\s_-]+/g, '');
}

const ALIASES: Record<string, string[]> = {
  lion: ['leon'], penguin: ['pinguino'], dragon: ['dragon'], hamster: ['hamster'],
  fox: ['zorro'], wolf: ['lobo'], rabbit: ['conejo'], elephant: ['elefante'],
  monkey: ['mono'], cat: ['gato'], bear: ['oso'], frog: ['rana'], tiger: ['tigre'],
  unicorn: ['unicornio'], pug: ['perrito', 'dog', 'perro'], chick: ['pollo', 'pollito'],
  octopus: ['pulpo'], whale: ['ballena'], koala: ['koala'], panda: ['panda']
};
export function findAnimal(value: string) {
  const normalized = normalizeAnimalText(value);
  return ANIMALS.find(animal => normalizeAnimalText(animal.id) === normalized
    || normalizeAnimalText(animal.name) === normalized
    || (ALIASES[animal.id] ?? []).some(alias => normalizeAnimalText(alias) === normalized));
}
export function getAnimalListReply(): string {
  return `Animales disponibles (${ANIMALS.length}): ` + ANIMALS.map(a => `${a.emoji} ${a.name}`).join(' · ')
    + '. Escribe el nombre de tu favorito en el chat; cada comentario válido suma un voto.';
}
