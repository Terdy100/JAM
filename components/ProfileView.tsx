
import React, { useRef, useState } from 'react';
import { User as UserType } from '../types';
import { 
  Award, 
  Settings, 
  LogOut, 
  Shield, 
  Trash2, 
  History, 
  Star, 
  Flame, 
  CheckCircle,
  ExternalLink,
  Lock,
  Download,
  Upload,
  RefreshCw,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ProfileViewProps {
  user: UserType;
  completedLessonsCount: number;
  totalLessons: number;
  onLogout: () => void;
}

const STORAGE_KEYS = [
  'jamtalk_user_session',
  'jamtalk_completed_lessons',
  'jamtalk_voice_preference',
  'jamtalk_chat_sessions',
  'jamtalk_live_history',
  'jamtalk_translation_history_v2',
  'jamtalk_coach_history'
];

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  completedLessonsCount, 
  totalLessons,
  onLogout 
}) => {
  const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const progressPercent = Math.round((completedLessonsCount / totalLessons) * 100);

  const handleExportData = () => {
    const backup: Record<string, string | null> = {};
    STORAGE_KEYS.forEach(key => {
      backup[key] = localStorage.getItem(key);
    });

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JamTalk_Backup_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportStatus('success');
    setTimeout(() => setExportStatus('idle'), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Basic validation: Check if it's an object and has at least one relevant key
        const hasKeys = STORAGE_KEYS.some(key => key in data);
        if (!hasKeys) throw new Error("Invalid backup file format.");

        // Apply data to localStorage
        Object.entries(data).forEach(([key, value]) => {
          if (STORAGE_KEYS.includes(key) && value !== null) {
            localStorage.setItem(key, value as string);
          }
        });

        setImportStatus('success');
        setTimeout(() => {
          // Reload app to reflect new data
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error("Import failed", err);
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (confirm('WARNING: This will permanently delete ALL your learning progress, chat history, and saved sessions from this device. This cannot be undone unless you have a backup file.\n\nAre you absolutely sure?')) {
      STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-24">
      {/* Header Profile Section */}
      <div className="bg-white p-8 border-b border-gray-100 flex flex-col items-center text-center">
        <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-yellow-400 p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl font-black text-green-600 border-4 border-white shadow-inner overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-gray-50 text-yellow-500">
                <Star size={16} fill="currentColor" />
            </div>
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user.name}</h2>
        <p className="text-gray-400 text-sm font-medium mb-4">{user.email}</p>
        
        <div className="flex gap-3">
            <div className="bg-green-50 px-4 py-1.5 rounded-full border border-green-100 text-green-700 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Award size={14} /> Patois Novice
            </div>
            <div className="bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-100 text-yellow-700 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Flame size={14} /> {user.xp} XP
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Learning Stats */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Course Mastery</h3>
            <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-gray-900">{progressPercent}%</span>
                <span className="text-xs text-gray-500 font-bold mb-1">{completedLessonsCount} / {totalLessons} Lessons</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-green-500 transition-all duration-1000" 
                    style={{ width: `${progressPercent}%` }} 
                />
            </div>
        </div>

        {/* Data Portability Section */}
        <div className="space-y-3">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Data Portability</h3>
             <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-4 space-y-4">
                 <p className="text-xs text-gray-500 leading-relaxed font-medium">
                   Since JamTalk stores your data locally for privacy, we recommend downloading a backup if you plan to switch devices.
                 </p>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleExportData}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                        exportStatus === 'success' 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-gray-50 border-gray-100 hover:border-green-200 text-gray-700'
                      }`}
                    >
                        {exportStatus === 'success' ? <Check size={20} className="mb-1" /> : <Download size={20} className="mb-1" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">Backup Profile</span>
                    </button>

                    <button 
                      onClick={handleImportClick}
                      disabled={importStatus === 'loading'}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                        importStatus === 'success' 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : importStatus === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-gray-50 border-gray-100 hover:border-blue-200 text-gray-700'
                      }`}
                    >
                        {importStatus === 'loading' ? <RefreshCw size={20} className="mb-1 animate-spin" /> : 
                         importStatus === 'success' ? <Check size={20} className="mb-1" /> :
                         importStatus === 'error' ? <AlertTriangle size={20} className="mb-1" /> :
                         <Upload size={20} className="mb-1" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {importStatus === 'success' ? 'Restored!' : 'Restore Profile'}
                        </span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileImport} 
                    />
                 </div>
             </div>
        </div>

        {/* Account & Security Section */}
        <div className="space-y-3">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Account & Security</h3>
             
             <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                 <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-700">
                        <Lock size={18} className="text-blue-500" />
                        <span className="text-sm font-bold">Privacy Settings</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-300" />
                 </button>
                 
                 <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-700">
                        <History size={18} className="text-orange-500" />
                        <span className="text-sm font-bold">Session History Settings</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-300" />
                 </button>

                 <button 
                   onClick={handleClearAllData}
                   className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-red-500"
                 >
                    <div className="flex items-center gap-3">
                        <Trash2 size={18} />
                        <span className="text-sm font-bold">Delete Account Data</span>
                    </div>
                 </button>
             </div>
        </div>

        {/* Support */}
        <div className="bg-[#052e16] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
             <Shield className="absolute -top-10 -right-10 text-white/5 w-40 h-40" />
             <h3 className="text-lg font-black italic mb-1 uppercase tracking-tighter">Secured by JamTalk</h3>
             <p className="text-xs text-green-100/60 leading-relaxed font-medium">
                Your recordings and chats are processed securely. We never share your voice data with third parties.
             </p>
        </div>

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="w-full bg-white border border-gray-200 py-4 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
        >
            <LogOut size={18} /> Sign Out of JamTalk
        </button>
      </div>
    </div>
  );
};
