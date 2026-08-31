// Fun starter ideas for the new-project dialog. Pills prefill IDEA.md; the set
// shown is a random handful from this pool (reshuffled on open / via the dice),
// so creating a project always feels a little playful. Pure content — edit
// freely, order doesn't matter.

export interface ProjectIdeaTemplate {
  id: string
  emoji: string
}

export const PROJECT_IDEA_TEMPLATES: ProjectIdeaTemplate[] = [
  {
    id: 'game-jam',
    emoji: '🎮'
  },
  {
    id: 'novel',
    emoji: '📚'
  },
  {
    id: 'discord-bot',
    emoji: '🤖'
  },
  {
    id: 'data-viz',
    emoji: '📊'
  },
  {
    id: 'generative-art',
    emoji: '🎨'
  },
  {
    id: 'recipe-box',
    emoji: '🍳'
  },
  {
    id: 'research-log',
    emoji: '🧪'
  },
  {
    id: 'budget-tracker',
    emoji: '💸'
  },
  {
    id: 'habit-tracker',
    emoji: '🌱'
  },
  {
    id: 'trip-planner',
    emoji: '🗺️'
  },
  {
    id: 'music-toy',
    emoji: '🎵'
  },
  {
    id: 'puzzle-maker',
    emoji: '🧩'
  },
  {
    id: 'digital-garden',
    emoji: '📝'
  },
  {
    id: 'api-wrapper',
    emoji: '🛰️'
  },
  {
    id: 'workout-plan',
    emoji: '🏋️'
  },
  {
    id: 'flashcards',
    emoji: '🧠'
  },
  {
    id: 'screenplay',
    emoji: '✍️'
  },
  {
    id: 'learn-by-building',
    emoji: '🔭'
  }
]

// A shuffled slice of the pool — the pills shown at any moment.
export function randomIdeaTemplates(count = 6): ProjectIdeaTemplate[] {
  const pool = [...PROJECT_IDEA_TEMPLATES]

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, Math.min(count, pool.length))
}
