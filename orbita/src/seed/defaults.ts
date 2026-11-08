import { addDays, todayISO } from '../domain/dates';
import { TEMPLATE_CRIADOR } from '../domain/areas';
import type { AppData, RoutineBlock, Settings } from '../domain/types';

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'dark',
  notifications: false,
  dayStart: '08:00',
  dayEnd: '22:00',
  weeklyWorkoutTarget: 0,
  onboarded: false,
};

export const DEFAULT_TAGS = ['urgente', 'rápida', 'faculdade', 'portfólio'];

export function emptyData(): AppData {
  return {
    version: 2, areas: TEMPLATE_CRIADOR.map((a) => ({ ...a })), tasks: [], routine: [], logs: [], vocab: [], chords: [], songs: [], skills: [],
    content: [], lives: [], goals: [], activity: [], tags: [...DEFAULT_TAGS], settings: { ...DEFAULT_SETTINGS },
  };
}

/** Optional private seed: src/seed/personal.local.ts (git-ignored). Not part of the public repository. */
type PersonalSeed = { name?: string; routine?: Omit<RoutineBlock, 'id'>[] };
const personalModules = import.meta.glob<{ default: PersonalSeed }>('./personal.local.ts', { eager: true });
// Never offered in multi-user (cloud) builds: it would be bundled into the public site.
const cloudBuild = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
export const personalSeed: PersonalSeed | null = cloudBuild ? null : Object.values(personalModules)[0]?.default ?? null;

/** Generic example routine used when no private seed exists. Times are left empty on purpose. */
export const EXAMPLE_ROUTINE: Omit<RoutineBlock, 'id'>[] = [
  { weekday: 1, title: 'Aula', area: 'programacao', period: 'manha', fixed: true },
  { weekday: 1, title: 'Treino', area: 'academia', period: 'tarde', fixed: true },
  { weekday: 3, title: 'Projeto pessoal', area: 'programacao', fixed: false },
  { weekday: 6, title: 'Descanso', area: 'pessoal', fixed: false },
];

/** Demo content so a new visitor (or the portfolio screenshots) can explore every screen. */
export function demoData(base: AppData): AppData {
  const t = todayISO();
  const now = new Date().toISOString();
  const mk = (title: string, area: AppData['tasks'][number]['area'], priority: 'alta' | 'media' | 'baixa', extra: Partial<AppData['tasks'][number]> = {}, i = 0) =>
    ({ id: uid(), title, area, priority, tags: [], done: false, date: t, createdAt: now, order: i, ...extra });
  const tasks = [
    mk('Finalizar layout do app', 'programacao', 'alta', { sub: 'Frontend', tags: ['portfólio'], start: '09:00', duration: 90 }, 0),
    mk('Revisar o código', 'programacao', 'media', { sub: 'Projetos pessoais', duration: 45 }, 1),
    mk('Estudar para a prova', 'programacao', 'media', { sub: 'Faculdade', tags: ['faculdade'], date: addDays(t, 1) }, 2),
    mk('Listening: podcast 20 min', 'ingles', 'media', { sub: 'Listening', duration: 20 }, 3),
    mk('Praticar escala pentatônica', 'guitarra', 'baixa', { sub: 'Exercícios', duration: 30, recurrence: { type: 'weekly', days: [2, 4] }, date: addDays(t, -14) }, 4),
    mk('Roteiro: Claude cria um app', 'conteudo', 'alta', { sub: 'Roteiros', start: '15:00', duration: 60 }, 5),
    mk('Responder e-mails', 'pessoal', 'baixa', { date: addDays(t, -2) }, 6),
    mk('Comprar café', 'pessoal', 'baixa', { done: true, doneAt: `${t}T08:10` }, 7),
  ];
  const logs: AppData['logs'] = [-6, -5, -3, -2, -1, 0].flatMap((d, i): AppData['logs'] => [
    { id: uid(), area: 'ingles' as const, date: addDays(t, d), minutes: 20 + i * 5, kind: i % 2 ? 'Listening' : 'Vocabulário' },
    { id: uid(), area: 'guitarra' as const, date: addDays(t, d - 1), minutes: 25 + (i % 3) * 10, kind: 'Exercícios' },
  ]).concat([-8, -6, -4, -1].map((d) => ({ id: uid(), area: 'academia', date: addDays(t, d), minutes: 60, kind: 'Treino' })));
  return {
    ...base,
    tasks,
    logs,
    vocab: [
      { id: uid(), word: 'deadline', meaning: 'prazo final', learned: true, createdAt: now },
      { id: uid(), word: 'to deploy', meaning: 'publicar (software)', learned: false, createdAt: now },
      { id: uid(), word: 'throughout', meaning: 'ao longo de', learned: false, createdAt: now },
    ],
    chords: [{ id: uid(), name: 'Am', status: 'dominado' }, { id: uid(), name: 'F', status: 'aprendendo' }, { id: uid(), name: 'G', status: 'dominado' }],
    songs: [{ id: uid(), title: 'Música exemplo', artist: 'Artista', progress: 40 }],
    skills: [
      { id: uid(), area: 'guitarra', name: 'Troca de acordes', level: 45 }, { id: uid(), area: 'guitarra', name: 'Ritmo', level: 30 },
      { id: uid(), area: 'ingles', name: 'Listening', level: 50 }, { id: uid(), area: 'ingles', name: 'Speaking', level: 25 },
    ],
    content: [
      { id: uid(), title: 'Claude consegue criar um app sozinho?', stage: 'publicado', platforms: ['TikTok', 'Instagram', 'YouTube'], createdAt: now, publishedAt: now },
      { id: uid(), title: '3 extensões do VS Code', stage: 'roteiro', platforms: ['TikTok'], createdAt: now },
      { id: uid(), title: 'Minha rotina de estudos', stage: 'ideia', platforms: ['YouTube'], createdAt: now },
    ],
    lives: [
      { id: uid(), date: addDays(t, -3), start: '20:00', duration: 90, platform: 'TikTok', title: 'Codando ao vivo', status: 'realizada', goal: 'Terminar o CRUD', result: 'CRUD pronto' },
      { id: uid(), date: addDays(t, 2), platform: 'TikTok', title: 'Q&A de programação', status: 'planejada' },
    ],
    goals: [
      { id: uid(), title: 'Praticar inglês', area: 'ingles', kind: 'minutes', target: 600, unit: 'min', deadline: addDays(t, 30), createdAt: addDays(t, -7) + 'T00:00' },
      { id: uid(), title: 'Frequência na academia', area: 'academia', kind: 'sessions', target: 12, unit: 'treinos', deadline: addDays(t, 25), createdAt: addDays(t, -10) + 'T00:00' },
    ],
    settings: { ...base.settings, weeklyWorkoutTarget: base.settings.weeklyWorkoutTarget || 3 },
  };
}
