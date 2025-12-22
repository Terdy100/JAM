
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { LessonsView } from './components/LessonsView';
import { ChatInterface } from './components/ChatInterface';
import { LiveSession } from './components/LiveSession';
import { TranslatorView } from './components/TranslatorView';
import { MusicLyricsView } from './components/MusicLyricsView';
import { PronunciationCoachView } from './components/PronunciationCoachView';
import { ProfileView } from './components/ProfileView';
import { AuthScreen } from './components/AuthScreen';
import { AppMode, Lesson, User } from './types';
import { Settings, X, Volume2, Check } from 'lucide-react';
import { AVAILABLE_VOICES, INITIAL_LESSONS } from './constants';

const USER_KEY = 'jamtalk_user_session';
const COMPLETED_LESSONS_KEY = 'jamtalk_completed_lessons';
const VOICE_KEY = 'jamtalk_voice_preference';

function App() {
  const [user, setUser] = useState<User | null>(() => {
      try {
          const saved = localStorage.getItem(USER_KEY);
          if (saved) {
              const parsed = JSON.parse(saved);
              return { ...parsed, joinedAt: new Date(parsed.joinedAt) };
          }
      } catch (e) {}
      return null;
  });

  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.LESSONS);
  const [liveContext, setLiveContext] = useState<string | undefined>(undefined);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COMPLETED_LESSONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem(VOICE_KEY) || 'Kore';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(completedLessons));
    if (user) {
        setUser(prev => prev ? { ...prev, xp: completedLessons.length * 100 } : null);
    }
  }, [completedLessons]);

  useEffect(() => {
    localStorage.setItem(VOICE_KEY, selectedVoice);
  }, [selectedVoice]);

  const handleLogin = (name: string, email: string, avatar?: string) => {
      const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          avatar,
          joinedAt: new Date(),
          xp: completedLessons.length * 100
      };
      setUser(newUser);
  };

  const handleLogout = () => {
      if (confirm('Are you sure you want to sign out? Your progress will remain saved on this device.')) {
          setUser(null);
      }
  };

  const handleStartLesson = (lesson: Lesson) => {
    const prompt = `I want to practice the lesson: "${lesson.title}". Topics are: ${lesson.topics.join(', ')}. Please act as my teacher for this specific topic. If I make mistakes, correct me gently.`;
    setLiveContext(prompt);
    setActiveLessonId(lesson.id);
    setCurrentMode(AppMode.LIVE);
  };

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    if (mode !== AppMode.LIVE) {
        setLiveContext(undefined);
        setActiveLessonId(null);
    }
  };

  const handleLessonComplete = () => {
    if (activeLessonId && !completedLessons.includes(activeLessonId)) {
      setCompletedLessons(prev => [...prev, activeLessonId]);
    }
    setActiveLessonId(null);
    setLiveContext(undefined);
    setCurrentMode(AppMode.LESSONS);
  };

  const handleExitLive = () => {
    setActiveLessonId(null);
    setLiveContext(undefined);
    setCurrentMode(AppMode.LESSONS);
  };

  // If not logged in, show Auth Wall
  if (!user) {
      return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇯🇲</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-yellow-500 bg-clip-text text-transparent italic">
              JamTalk
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-100 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Secure
             </div>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
             >
                <Settings size={20} />
             </button>
          </div>
        </div>
      </header>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Settings size={18} /> Voice Engine
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Select Voice</h4>
                    <div className="space-y-3">
                        {AVAILABLE_VOICES.map((voice) => (
                            <button
                                key={voice.id}
                                onClick={() => setSelectedVoice(voice.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    selectedVoice === voice.id 
                                        ? 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500' 
                                        : 'border-gray-200 hover:border-green-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        selectedVoice === voice.id ? 'bg-green-200' : 'bg-gray-100'
                                    }`}>
                                        <Volume2 size={18} className={selectedVoice === voice.id ? 'text-green-700' : 'text-gray-400'} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">{voice.name}</div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{voice.gender}</span>
                                    </div>
                                </div>
                                {selectedVoice === voice.id && <Check size={20} className="text-green-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={() => setIsSettingsOpen(false)} className="text-sm font-bold text-green-600">Done</button>
                </div>
            </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {currentMode === AppMode.LESSONS && (
          <LessonsView onStartLesson={handleStartLesson} completedLessonIds={completedLessons} />
        )}
        
        {currentMode === AppMode.CHAT && (
          <ChatInterface selectedVoice={selectedVoice} onOpenSettings={() => setIsSettingsOpen(true)} />
        )}

        {currentMode === AppMode.LIVE && (
          <div className="h-full pb-20">
             <LiveSession 
               initialContext={liveContext} 
               canMarkComplete={!!activeLessonId}
               onComplete={handleLessonComplete}
               onExit={handleExitLive}
               selectedVoice={selectedVoice}
               onOpenSettings={() => setIsSettingsOpen(true)}
             />
          </div>
        )}

        {currentMode === AppMode.COACH && (
          <PronunciationCoachView selectedVoice={selectedVoice} onOpenSettings={() => setIsSettingsOpen(true)} />
        )}

        {currentMode === AppMode.TRANSLATE && (
          <TranslatorView selectedVoice={selectedVoice} onOpenSettings={() => setIsSettingsOpen(true)} />
        )}

        {currentMode === AppMode.MUSIC && (
          <MusicLyricsView />
        )}

        {currentMode === AppMode.PROFILE && (
          <ProfileView 
            user={user} 
            completedLessonsCount={completedLessons.length} 
            totalLessons={INITIAL_LESSONS.length}
            onLogout={handleLogout}
          />
        )}
      </main>

      <Navigation currentMode={currentMode} onChangeMode={handleModeChange} />
    </div>
  );
}

export default App;
