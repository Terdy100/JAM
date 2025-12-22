
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Volume2, StopCircle, VolumeX, Trash2, Heart, Mic, MicOff, Menu, Plus, X, MessageSquare, Calendar, Search } from 'lucide-react';
import { Message } from '../types';
import { ai } from '../services/gemini';
import { SYSTEM_INSTRUCTION, EMPATHY_INSTRUCTION } from '../constants';
import { base64ToUint8Array, decodeAudioData } from '../utils/audio';
import ReactMarkdown from 'react-markdown';
import { Modality } from '@google/genai';

const SESSIONS_KEY = 'jamtalk_chat_sessions';
const LEGACY_KEY = 'jamtalk_chat_history';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  currentSessionId
}) => {
  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.lastModified);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let key = 'Older';
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const groupOrder = ['Today', 'Yesterday', 'Older'];

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-3/4 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare size={18} /> Conversations
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
            <button
                onClick={() => {
                    onNewChat();
                    onClose();
                }}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
            >
                <Plus size={18} /> New Chat
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
           {sessions.length === 0 ? (
             <div className="text-center py-10 text-gray-400">
               <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
               <p className="text-sm">No saved chats</p>
             </div>
           ) : (
             groupOrder.map(group => {
               const groupItems = groupedSessions[group];
               if (!groupItems || groupItems.length === 0) return null;

               return (
                 <div key={group} className="space-y-2">
                   <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                     <Calendar size={10} /> {group}
                   </h4>
                   <div className="space-y-2">
                     {groupItems.sort((a,b) => b.lastModified - a.lastModified).map((session) => (
                       <div 
                          key={session.id} 
                          className={`group relative rounded-xl border p-3 cursor-pointer transition-all ${
                              currentSessionId === session.id 
                                ? 'bg-green-50 border-green-200 shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-green-200 hover:shadow-sm'
                          }`}
                          onClick={() => {
                              onSelectSession(session);
                              onClose();
                          }}
                       >
                         <h5 className={`text-sm font-medium mb-1 line-clamp-1 pr-6 ${
                             currentSessionId === session.id ? 'text-green-800' : 'text-gray-800'
                         }`}>
                             {session.title || 'New Conversation'}
                         </h5>
                         <p className="text-xs text-gray-500 line-clamp-1">
                             {session.messages[session.messages.length - 1]?.text || 'Empty'}
                         </p>
                         
                         <button
                            onClick={(e) => onDeleteSession(session.id, e)}
                            className="absolute right-2 top-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Chat"
                         >
                             <Trash2 size={14} />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               );
             })
           )}
        </div>
      </div>
    </div>
  );
};

interface ChatInterfaceProps {
  selectedVoice: string;
  onOpenSettings: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedVoice, onOpenSettings }) => {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
      try {
          const savedSessions = localStorage.getItem(SESSIONS_KEY);
          if (savedSessions) {
              const parsed = JSON.parse(savedSessions);
              // Revive dates
              return parsed.map((s: any) => ({
                  ...s,
                  messages: s.messages.map((m: any) => ({
                      ...m,
                      timestamp: new Date(m.timestamp)
                  }))
              }));
          }
          
          // Migration: Check for legacy single-thread history
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
              const parsedLegacy = JSON.parse(legacy);
              const migratedMessages = parsedLegacy.map((m: any) => ({
                  ...m,
                  timestamp: new Date(m.timestamp)
              }));
              
              if (migratedMessages.length > 0) {
                  const newSession: ChatSession = {
                      id: Date.now().toString(),
                      title: "Previous Conversation",
                      messages: migratedMessages,
                      lastModified: Date.now()
                  };
                  localStorage.removeItem(LEGACY_KEY); // Clear legacy
                  return [newSession];
              }
          }
      } catch (e) {
          console.error("Failed to load sessions", e);
      }
      return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
      // Default to most recent session if available
      return null; 
  });

  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings State
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isEmpathyMode, setIsEmpathyMode] = useState(true);

  // Audio State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize view with current session or welcome message
  useEffect(() => {
      if (currentSessionId) {
          const session = sessions.find(s => s.id === currentSessionId);
          if (session) {
              setMessages(session.messages);
          }
      } else if (messages.length === 0) {
          // Default welcome message for new/empty state
          setMessages([{
            id: 'welcome',
            role: 'model',
            text: "Wa gwaan! I'm JamTalk. Ready to learn some Patois? Type something or ask me how to say a phrase!",
            timestamp: new Date()
          }]);
      }
  }, [currentSessionId]); // Only run when switching sessions

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingAudioId]);

  // Save Sessions Persistence
  useEffect(() => {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Update current session when messages change
  useEffect(() => {
      if (messages.length === 0) return;
      
      // Don't save if it's just the initial welcome message and nothing else
      if (messages.length === 1 && messages[0].id === 'welcome') return;

      setSessions(prev => {
          const now = Date.now();
          let newSessions = [...prev];
          
          if (currentSessionId) {
              // Update existing session
              const index = newSessions.findIndex(s => s.id === currentSessionId);
              if (index !== -1) {
                  newSessions[index] = {
                      ...newSessions[index],
                      messages: messages,
                      lastModified: now,
                      // Update title if it's the first user message being added
                      title: newSessions[index].title === 'New Chat' 
                          ? generateTitle(messages) 
                          : newSessions[index].title
                  };
              }
          } else {
              // We are in a "New Chat" state but user sent a message
              // Create a new session now
              const newId = Date.now().toString();
              const newSession: ChatSession = {
                  id: newId,
                  title: generateTitle(messages),
                  messages: messages,
                  lastModified: now
              };
              newSessions = [newSession, ...newSessions];
              // We must perform a side-effect here to set the ID, 
              // strictly this should be done in the handler, but this ensures consistency
              // For safety, we'll let the handler manage ID setting mostly
          }
          return newSessions;
      });
  }, [messages]);

  const generateTitle = (msgs: Message[]): string => {
      const firstUserMsg = msgs.find(m => m.role === 'user');
      if (firstUserMsg) {
          return firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
      }
      return 'New Conversation';
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Clear audio cache if voice changes
  useEffect(() => {
    audioCacheRef.current.clear();
  }, [selectedVoice]);

  const stopAudio = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      activeSourceRef.current = null;
    }
    setPlayingMessageId(null);
    setLoadingAudioId(null);
  };

  const handleNewChat = () => {
      stopAudio();
      setCurrentSessionId(null);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: "Wa gwaan! I'm JamTalk. Ready to learn some Patois? Type something or ask me how to say a phrase!",
        timestamp: new Date()
      }]);
      setIsSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Delete this conversation?")) {
          setSessions(prev => prev.filter(s => s.id !== sessionId));
          if (currentSessionId === sessionId) {
              handleNewChat();
          }
      }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
         setInputText(prev => {
             const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
             return prev + spacer + transcript;
         });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const playMessageAudio = async (text: string, messageId: string) => {
    if (!text || !text.trim()) return;

    if (playingMessageId === messageId) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingAudioId(messageId);

    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let audioBuffer: AudioBuffer;

      // Check cache with key including voice ID
      const cacheKey = `${messageId}-${selectedVoice}`;

      if (audioCacheRef.current.has(cacheKey)) {
        audioBuffer = audioCacheRef.current.get(cacheKey)!;
      } else {
        const cleanText = text.replace(/[*_~`]/g, '').trim();
        if (!cleanText) throw new Error("Text is empty after sanitization");

        // Safeguard: Truncate text if it's too long for TTS
        const maxLength = 600; 
        const textToSpeak = cleanText.length > maxLength ? cleanText.substring(0, maxLength) + "..." : cleanText;

        // Fix: Corrected model name and used Modality.AUDIO enum
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: textToSpeak }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        
        if (part?.text && !part?.inlineData) {
          throw new Error("TTS generation failed: " + part.text);
        }

        const base64Audio = part?.inlineData?.data;

        if (!base64Audio) {
          throw new Error("No audio data received from API");
        }

        audioBuffer = await decodeAudioData(
          base64ToUint8Array(base64Audio),
          ctx,
          24000
        );

        audioCacheRef.current.set(cacheKey, audioBuffer);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setPlayingMessageId(null);
        activeSourceRef.current = null;
      };

      activeSourceRef.current = source;
      source.start();
      setPlayingMessageId(messageId);

    } catch (error) {
      console.error("Failed to play audio:", error);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    stopAudio();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    // Optimistically update messages
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    
    // Create session ID if it doesn't exist yet
    if (!currentSessionId) {
        const newId = Date.now().toString();
        setCurrentSessionId(newId);
        // Add to sessions immediately
        setSessions(prev => [{
            id: newId,
            title: generateTitle([userMsg]),
            messages: updatedMessages,
            lastModified: Date.now()
        }, ...prev]);
    }

    setInputText('');
    setIsLoading(true);

    try {
      const history = updatedMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      let effectiveInstruction = SYSTEM_INSTRUCTION;
      if (isEmpathyMode) {
        effectiveInstruction += `\n\n${EMPATHY_INSTRUCTION}`;
      }

      // Fix: Used 'gemini-3-flash-preview' for chat/text task
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: history,
        config: {
          systemInstruction: effectiveInstruction,
        },
      });

      const result = await chat.sendMessage({ message: inputText });
      
      const newId = (Date.now() + 1).toString();
      const botMsg: Message = {
        id: newId,
        role: 'model',
        text: result.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);

      if (isAutoplay) {
        await playMessageAudio(result.text, newId);
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Lawd gad! Something mash up. Try again nuh?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 pt-4 pb-20 relative overflow-hidden">
      
      {/* Header Controls */}
      <div className="px-4 pb-2 flex justify-between items-center gap-2">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
          title="History"
        >
          <Menu size={20} />
          {/* Badge if we have sessions */}
          {sessions.length > 0 && (
             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
          )}
        </button>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
             {/* Voice Indicator */}
            <button 
                onClick={onOpenSettings}
                className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-full transition-colors border bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                title="Change Voice"
            >
                <Volume2 size={12} /> {selectedVoice}
            </button>

            <button
            onClick={() => setIsEmpathyMode(!isEmpathyMode)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-full transition-colors border ${
                isEmpathyMode 
                ? 'bg-red-50 text-red-600 border-red-200' 
                : 'bg-white text-gray-400 border-gray-200'
            }`}
            title={isEmpathyMode ? "Disable Empathy Mode" : "Enable Empathy Mode"}
            >
            {isEmpathyMode ? <Heart size={12} className="fill-current" /> : <Heart size={12} />}
            {isEmpathyMode ? 'Mood AI' : 'Mood AI'}
            </button>

            <button 
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-full transition-colors border ${
                isAutoplay 
                ? 'bg-green-50 text-green-600 border-green-200' 
                : 'bg-white text-gray-400 border-gray-200'
            }`}
            >
            {isAutoplay ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {isAutoplay ? 'Auto' : 'Auto'}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-green-600 to-green-500 text-white rounded-tr-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="text-[10px] font-medium">
                  {msg.role === 'user' ? 'You' : 'JamTalk'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="leading-relaxed text-sm whitespace-pre-wrap">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {msg.role === 'model' && (
                <div className="mt-2 flex items-center gap-2 pt-2 border-t border-gray-100/50">
                  <button 
                    onClick={() => playMessageAudio(msg.text, msg.id)}
                    disabled={loadingAudioId === msg.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        loadingAudioId === msg.id
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : playingMessageId === msg.id
                                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                     {loadingAudioId === msg.id ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            Loading...
                        </>
                     ) : playingMessageId === msg.id ? (
                        <>
                            <StopCircle size={12} />
                            Stop
                        </>
                     ) : (
                        <>
                            <Volume2 size={12} />
                            Listen
                        </>
                     )}
                  </button>
                  
                  {loadingAudioId === msg.id && (
                     <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[90%] animate-[progress_1.5s_ease-in-out_infinite] origin-left"></div>
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-green-500" />
              <span className="text-sm text-gray-500">JamTalk is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 bg-white border-t border-gray-100">
        <div className="bg-gray-50 p-2 rounded-2xl flex items-center gap-2 border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? "Listening..." : "Type a message..."}
            className={`flex-1 bg-transparent outline-none text-sm px-2 ${isListening ? 'placeholder-red-500' : ''}`}
            disabled={isLoading}
          />

           <div className="relative">
             {/* Mic Glow Effect */}
             <div 
                className={`absolute inset-0 rounded-full bg-red-400 opacity-20 transition-transform duration-75 pointer-events-none ${isListening ? 'scale-[var(--mic-level,1)]' : 'scale-0'}`}
                style={{ '--mic-level': 1 } as React.CSSProperties}
             ></div>
             
             <button
               onClick={toggleListening}
               className={`p-2 rounded-full transition-colors relative z-10 ${
                 isListening 
                   ? 'bg-red-50 text-red-500 animate-pulse' 
                   : 'bg-gray-200 hover:bg-gray-300 text-gray-500'
               }`}
             >
               {isListening ? <MicOff size={18} /> : <Mic size={18} />}
             </button>
           </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <ChatSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        onSelectSession={(s) => setCurrentSessionId(s.id)}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        currentSessionId={currentSessionId}
      />
    </div>
  );
};
