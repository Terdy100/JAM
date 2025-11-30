
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Lesson {
  id: string;
  moduleId: string; // Linked to a module
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  emoji: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  order: number;
}

export interface Certificate {
  id: string;
  userName: string;
  date: Date;
  courseTitle: string;
}

export type TranslationDirection = 'en-to-pat' | 'pat-to-en';

export interface TranslationHistoryItem {
  id: string;
  original: string;
  translated: string;
  timestamp: Date;
  direction: TranslationDirection;
  pronunciation?: string;
}

export interface LiveSessionRecord {
    id: string;
    title: string;
    date: number;
    transcript: Message[];
}

export interface CoachHistoryItem {
  id: string;
  targetPhrase: {
    patois: string;
    english: string;
  };
  score: number;
  feedback: {
    score: number;
    phonemes: string;
    feedback: string;
    fix: string;
  };
  timestamp: Date;
}

export enum AppMode {
  LESSONS = 'lessons',
  CHAT = 'chat',
  LIVE = 'live',
  TRANSLATE = 'translate',
  MUSIC = 'music',
  COACH = 'coach'
}
