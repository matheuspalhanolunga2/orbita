/** Area ids are user-defined strings (templates use 'programacao', 'ingles', …). */
export type AreaId = string;

/** Optional tools an area can enable */
export type AreaModule = 'registro' | 'habilidades' | 'vocabulario' | 'musica' | 'frequencia' | 'conteudo' | 'lives';
export type AreaIconName =
  | 'code' | 'languages' | 'guitar' | 'dumbbell' | 'clapperboard' | 'radio' | 'user' | 'book' | 'briefcase' | 'heart'
  | 'home' | 'wallet' | 'graduation' | 'music' | 'palette' | 'coffee' | 'plane' | 'sprout' | 'gamepad' | 'church' | 'star';

export interface Area {
  id: AreaId;
  label: string;
  color: string;
  icon: AreaIconName;
  subs: string[];
  modules: AreaModule[];
  order: number;
  archived?: boolean;
}
export type Priority = 'alta' | 'media' | 'baixa';
export type Period = 'manha' | 'tarde' | 'noite' | 'dia';
/** ISO date YYYY-MM-DD */
export type ISODate = string;
/** 24h time HH:mm */
export type HHmm = string;

export interface Recurrence {
  type: 'daily' | 'weekly';
  /** 0 = domingo … 6 = sábado (only for weekly) */
  days?: number[];
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  area: AreaId;
  sub?: string;
  priority: Priority;
  tags: string[];
  /** single task: concluded flag */
  done: boolean;
  doneAt?: string;
  /** date it is planned for (single) or start date (recurring) */
  date?: ISODate;
  start?: HHmm;
  /** minutes */
  duration?: number;
  recurrence?: Recurrence;
  /** recurring task: dates whose occurrence was completed */
  doneDates?: ISODate[];
  /** minutes before start to notify */
  reminder?: number;
  createdAt: string;
  order: number;
}

export interface RoutineBlock {
  id: string;
  weekday: number;
  title: string;
  area: AreaId;
  period?: Period;
  start?: HHmm;
  end?: HHmm;
  /** fixed commitment (faculdade, culto…) vs flexible slot */
  fixed: boolean;
  note?: string;
}

export interface LogEntry {
  id: string;
  area: AreaId;
  date: ISODate;
  minutes?: number;
  /** e.g. 'listening', 'treino', 'acordes' */
  kind: string;
  note?: string;
}

export interface VocabItem { id: string; word: string; meaning: string; learned: boolean; createdAt: string }
export interface Chord { id: string; name: string; status: 'aprendendo' | 'dominado' }
export interface Song { id: string; title: string; artist?: string; progress: number }
export interface Skill { id: string; area: AreaId; name: string; level: number }

export type ContentStage = 'ideia' | 'roteiro' | 'gravar' | 'edicao' | 'publicado';
export type Platform = 'TikTok' | 'Instagram' | 'YouTube';
export interface ContentItem {
  id: string; title: string; stage: ContentStage; platforms: Platform[];
  script?: string; date?: ISODate; createdAt: string; publishedAt?: string;
}

export interface Live {
  id: string; date: ISODate; start?: HHmm; duration?: number; platform: string; title: string;
  goal?: string; status: 'planejada' | 'realizada'; result?: string; notes?: string;
}

export type GoalKind = 'tasks' | 'minutes' | 'sessions' | 'published' | 'lives' | 'manual';
export interface Goal {
  id: string; title: string; area: AreaId; kind: GoalKind; target: number; unit: string;
  deadline?: ISODate; manualValue?: number; manualHistory?: { date: ISODate; value: number }[];
  createdAt: string; archived?: boolean;
}

export interface Activity { id: string; at: string; text: string; area?: AreaId }

export interface Settings {
  name: string;
  theme: 'dark' | 'light';
  notifications: boolean;
  dayStart: HHmm;
  dayEnd: HHmm;
  weeklyWorkoutTarget: number;
  onboarded: boolean;
}

export interface AppData {
  version: number;
  areas: Area[];
  tasks: Task[];
  routine: RoutineBlock[];
  logs: LogEntry[];
  vocab: VocabItem[];
  chords: Chord[];
  songs: Song[];
  skills: Skill[];
  content: ContentItem[];
  lives: Live[];
  goals: Goal[];
  activity: Activity[];
  tags: string[];
  settings: Settings;
}
