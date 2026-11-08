import type { Area, AreaId, AreaModule } from './types';

/** Area plus a short label used in compact places (chips, selects). */
export interface AreaMeta extends Area { short: string }

const tpl = (id: string, label: string, color: string, icon: Area['icon'], subs: string[], modules: AreaModule[], order: number): Area =>
  ({ id, label, color, icon, subs, modules, order });

/** Template for students / content creators — the original Órbita areas. */
export const TEMPLATE_CRIADOR: Area[] = [
  tpl('programacao', 'Programação', '#8b7bff', 'code', ['Backend', 'Frontend', 'Faculdade', 'Projetos pessoais', 'Estudos de tecnologia', 'GitHub e portfólio'], ['registro', 'habilidades'], 0),
  tpl('ingles', 'Inglês', '#4bc0ff', 'languages', ['Vocabulário', 'Gramática', 'Listening', 'Speaking', 'Exercícios diários'], ['registro', 'habilidades', 'vocabulario'], 1),
  tpl('guitarra', 'Guitarra', '#ffc24b', 'guitar', ['Acordes', 'Exercícios', 'Músicas', 'Técnica'], ['registro', 'habilidades', 'musica'], 2),
  tpl('academia', 'Academia', '#3ddc97', 'dumbbell', ['Treino', 'Cardio', 'Mobilidade'], ['registro', 'frequencia'], 3),
  tpl('conteudo', 'Criação de conteúdo', '#ff6b9a', 'clapperboard', ['Ideias', 'Roteiros', 'Gravação', 'Edição', 'Publicação'], ['conteudo'], 4),
  tpl('lives', 'Lives', '#ff8a5c', 'radio', ['Planejamento', 'Transmissão', 'Pós-live'], ['lives'], 5),
  tpl('pessoal', 'Pessoal', '#a3a9bd', 'user', ['Compromissos', 'Família', 'Descanso', 'Planejamento'], [], 6),
];

/** Simple template for anyone. */
export const TEMPLATE_BASICO: Area[] = [
  tpl('pessoal', 'Pessoal', '#a3a9bd', 'user', ['Casa', 'Família', 'Compras'], [], 0),
  tpl('estudos', 'Estudos', '#8b7bff', 'graduation', ['Aulas', 'Provas', 'Trabalhos'], ['registro'], 1),
  tpl('trabalho', 'Trabalho', '#4bc0ff', 'briefcase', ['Reuniões', 'Projetos', 'E-mails'], [], 2),
  tpl('saude', 'Saúde', '#3ddc97', 'heart', ['Exercício', 'Consultas', 'Alimentação'], ['registro', 'frequencia'], 3),
];

export const TEMPLATES = { criador: TEMPLATE_CRIADOR, basico: TEMPLATE_BASICO } as const;
export type TemplateId = keyof typeof TEMPLATES;

export const MODULES: Record<AreaModule, { label: string; help: string }> = {
  registro: { label: 'Registro de tempo', help: 'Registrar sessões com minutos + gráfico semanal' },
  habilidades: { label: 'Habilidades', help: 'Nível de 0 a 100 por habilidade' },
  vocabulario: { label: 'Vocabulário', help: 'Palavras e significados (idiomas)' },
  musica: { label: 'Acordes e músicas', help: 'Para instrumentos musicais' },
  frequencia: { label: 'Frequência', help: 'Mapa de dias praticados + meta semanal' },
  conteudo: { label: 'Pipeline de conteúdo', help: 'Kanban de ideias até publicação' },
  lives: { label: 'Lives', help: 'Planejamento e histórico de transmissões' },
};

export const AREA_COLORS = ['#8b7bff', '#4bc0ff', '#3ddc97', '#ffc24b', '#ff8a5c', '#ff6b9a', '#ff6b6b', '#c86bff', '#2ec5c5', '#a3a9bd'];

/* ---------- registry: kept in sync with the store (see store/useStore.ts) ---------- */
let current: Area[] = TEMPLATE_CRIADOR;
export const setAreaRegistry = (list: Area[]) => { current = list; };
export const allAreas = (): Area[] => [...current].sort((a, b) => a.order - b.order);
export const activeAreas = (): AreaMeta[] => allAreas().filter((a) => !a.archived).map(withShort);

const FALLBACK: Area = { id: '_', label: 'Sem área', color: '#8a90a6', icon: 'star', subs: [], modules: [], order: 999 };
function withShort(a: Area): AreaMeta {
  const first = a.label.split(/\s+/)[0];
  return { ...a, short: a.label.length > 12 ? (a.id === 'conteudo' ? 'Conteúdo' : first) : a.label };
}
export const area = (id: AreaId): AreaMeta => withShort(current.find((a) => a.id === id) ?? { ...FALLBACK, id });
export const hasModule = (id: AreaId, m: AreaModule) => !!current.find((a) => a.id === id)?.modules.includes(m);
export const firstArea = (): AreaId => activeAreas()[0]?.id ?? 'pessoal';
export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'area';

export const PRIORITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' } as const;
export const PRIORITY_WEIGHT = { alta: 0, media: 1, baixa: 2 } as const;
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const PERIOD_LABEL = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', dia: 'Durante o dia' } as const;
