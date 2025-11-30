
import React from 'react';
import { BookOpen, MessageSquare, Mic, Languages, Music, Activity } from 'lucide-react';
import { AppMode } from '../types';

interface NavigationProps {
  currentMode: AppMode;
  onChangeMode: (mode: AppMode) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentMode, onChangeMode }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-1">
        <button
          onClick={() => onChangeMode(AppMode.LESSONS)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.LESSONS ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <BookOpen size={20} strokeWidth={currentMode === AppMode.LESSONS ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Lessons</span>
        </button>

        <button
          onClick={() => onChangeMode(AppMode.CHAT)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.CHAT ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <MessageSquare size={20} strokeWidth={currentMode === AppMode.CHAT ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Chat</span>
        </button>

        <button
          onClick={() => onChangeMode(AppMode.LIVE)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.LIVE ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Mic size={20} strokeWidth={currentMode === AppMode.LIVE ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Live</span>
        </button>

        <button
          onClick={() => onChangeMode(AppMode.COACH)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.COACH ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Activity size={20} strokeWidth={currentMode === AppMode.COACH ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Coach</span>
        </button>

        <button
          onClick={() => onChangeMode(AppMode.TRANSLATE)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.TRANSLATE ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Languages size={20} strokeWidth={currentMode === AppMode.TRANSLATE ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Translate</span>
        </button>

        <button
          onClick={() => onChangeMode(AppMode.MUSIC)}
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentMode === AppMode.MUSIC ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Music size={20} strokeWidth={currentMode === AppMode.MUSIC ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Music</span>
        </button>
      </div>
    </nav>
  );
};
