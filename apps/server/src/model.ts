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
  { id: 'dragon', name: 'Dragón', emoji: '🐲', rarity: 'legendario' }
] as const;
export type AnimalId = typeof ANIMALS[number]['id'];
