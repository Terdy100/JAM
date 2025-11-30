
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Mic, Square, RefreshCw, Volume2, ChevronRight, Loader2, Award, Zap, History, Calendar, X, StopCircle } from 'lucide-react';
import { ai } from '../services/gemini';
import { Type } from '@google/genai';
import { base64ToUint8Array, decodeAudioData, arrayBufferToBase64 } from '../utils/audio';
import { CoachHistoryItem } from '../types';

const HISTORY_KEY = 'jamtalk_coach_history';

interface FeedbackData {
  score: number;
  phonemes: string;
  feedback: string;
  fix: string;
}

interface CoachHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: CoachHistoryItem[];
  onSelect: (item: CoachHistoryItem) => void;
  onClear: () => void;
}

const CoachHistorySidebar: React.FC<CoachHistorySidebarProps> = ({ isOpen, onClose, history, onSelect, onClear }) => {
    const groupedHistory = history.reduce((acc, item) => {
        const date = new Date(item.timestamp);
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
        acc[key].push(item);
        return acc;
    }, {} as Record<string, CoachHistoryItem[]>);
    
    const groupOrder = ['Today', 'Yesterday', 'Older'];
    
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
            onClick={onClose}
          />
          <div className="relative w-3/4 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <History size={18} /> Past Challenges
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {history.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <History size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No practice history</p>
                    </div>
                ) : (
                    groupOrder.map(group => {
                        const items = groupedHistory[group];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={group} className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                                    <Calendar size={10} /> {group}
                                </h4>
                                <div className="space-y-2">
                                    {items.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => onSelect(item)}
                                            className="group bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:border-green-200 hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
                                        >
                                            <div className="flex-1 mr-2">
                                                <h5 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1">
                                                    {item.targetPhrase.patois}
                                                </h5>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                item.score >= 80 ? 'bg-green-100 text-green-700' :
                                                item.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.score}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={onClear}
                  className="w-full text-red-500 text-sm font-medium p-2 hover:bg-red-50 rounded-lg"
                >
                  Clear History
                </button>
            </div>
          </div>
        </div>
    );
};

interface PronunciationCoachViewProps {
  selectedVoice?: string;
  onOpenSettings: () => void;
}

export const PronunciationCoachView: React.FC<PronunciationCoachViewProps> = ({ selectedVoice = 'Kore', onOpenSettings }) => {
  const [targetPhrase, setTargetPhrase] = useState<{ patois: string, english: string } | null>(null);
  const [isGeneratingPhrase, setIsGeneratingPhrase] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  
  // History State
  const [history, setHistory] = useState<CoachHistoryItem[]>(() => {
      try {
          const saved = localStorage.getItem(HISTORY_KEY);
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Audio state
  const [nativeAudioBuffer, setNativeAudioBuffer] = useState<AudioBuffer | null>(null);
  const [userAudioBuffer, setUserAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const nativeCanvasRef = useRef<HTMLCanvasElement>(null);
  const userCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nativeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const userSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Initialize Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    return () => {
      stopAllAudio();
      audioContextRef.current?.close();
    };
  }, []);

  // Persist history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const stopAllAudio = () => {
    if (nativeSourceRef.current) {
        try { nativeSourceRef.current.stop(); } catch(e) {}
        nativeSourceRef.current = null;
    }
    if (userSourceRef.current) {
        try { userSourceRef.current.stop(); } catch(e) {}
        userSourceRef.current = null;
    }
    setIsPlayingNative(false);
    setIsPlayingUser(false);
  };

  const fetchNewPhrase = async () => {
    stopAllAudio();
    setIsGeneratingPhrase(true);
    setFeedback(null);
    setUserAudioBuffer(null);
    setNativeAudioBuffer(null);
    
    try {
      // Use string prompt for simplicity and robustness
      const prompt = "Generate a short, challenging Jamaican Patois phrase for pronunciation practice. Include the English meaning. Return a clean JSON object with keys: 'patois' and 'english'. Ensure the content is safe and educational.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 600, // Limit response size to prevent truncation errors
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patois: { type: Type.STRING },
              english: { type: Type.STRING }
            }
          }
        }
      });
      
      let text = response.text;
      
      // Extended checks for empty text if the main getter fails
      if (!text && response.candidates && response.candidates.length > 0) {
          const part = response.candidates[0].content?.parts?.[0];
          if (part && 'text' in part) {
              text = part.text as string;
          }
      }
      
      if (!text) {
          throw new Error("Empty response from AI");
      }
      
      // Sanitize JSON
      text = text.replace(/```json\n?|\n?```/g, '').trim();

      const json = JSON.parse(text);
      if (!json.patois) throw new Error("Invalid response format");
      
      setTargetPhrase(json);
      generateNativeAudio(json.patois);
    } catch (e) {
      console.warn("Error fetching phrase, using fallback", e);
      // Fallback
      setTargetPhrase({
        patois: "Wah gwaan, everything irie?",
        english: "What's up, is everything good?"
      });
      generateNativeAudio("Wah gwaan, everything irie?");
    } finally {
      setIsGeneratingPhrase(false);
    }
  };

  const generateNativeAudio = async (text: string) => {
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Truncate text to avoid token limit errors for TTS (limit to ~600 chars)
      const maxLength = 600;
      const textToSpeak = text.length > maxLength ? text.substring(0, maxLength) : text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
            }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
            base64ToUint8Array(base64Audio),
            ctx,
            24000
        );
        setNativeAudioBuffer(audioBuffer);
        setTimeout(() => drawWaveform(audioBuffer, nativeCanvasRef.current, '#22c55e'), 100);
      }
    } catch (e) {
      console.error("TTS generation error", e);
    }
  };

  useEffect(() => {
    // Only fetch if no phrase is set (e.g. initial load or reset)
    if (!targetPhrase) {
        fetchNewPhrase();
    }
  }, []);

  const drawWaveform = (buffer: AudioBuffer, canvas: HTMLCanvasElement | null, color: string) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    // Draw middle line
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, amp, width, 1);
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  };

  const startRecording = async () => {
    try {
      stopAllAudio();
      setFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // Use logic to determine supported mime type if needed, but 'audio/webm' is usually fine for Chrome/Firefox
        // For Safari, we might need a different approach or rely on the browser to handle it.
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Convert for visualization
        const arrayBuffer = await blob.arrayBuffer();
        if (audioContextRef.current) {
             const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0));
             setUserAudioBuffer(audioBuffer);
             drawWaveform(audioBuffer, userCanvasRef.current, '#3b82f6'); // Blue
        }

        // Analyze
        analyzePronunciation(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzePronunciation = async (audioBlob: Blob) => {
    if (!targetPhrase) return;
    setIsAnalyzing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);

      const prompt = `Act as a strict Jamaican Patois vocal coach. Listen to this recording of the user saying: "${targetPhrase.patois}". 
      1. Rate pronunciation accuracy 0-100.
      2. Identify specific phoneme errors (e.g., 'Th' sound vs 'D' sound).
      3. Provide a short, specific tip to fix it.
      
      Return JSON: { score: number, phonemes: string, feedback: string, fix: string }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 1000, // Increased limit for detailed analysis
           responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              phonemes: { type: Type.STRING },
              feedback: { type: Type.STRING },
              fix: { type: Type.STRING }
            }
          }
        }
      });

      let text = response.text;
      
      // Extended checks for empty text
      if (!text && response.candidates && response.candidates.length > 0) {
          const part = response.candidates[0].content?.parts?.[0];
          if (part && 'text' in part) {
              text = part.text as string;
          }
      }

      if (!text) throw new Error("Empty analysis response");
      
      // Robust JSON extraction
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
          text = text.substring(startIndex, endIndex + 1);
      } else {
          text = text.replace(/```json\n?|\n?```/g, '').trim();
      }

      const json = JSON.parse(text);
      const feedbackData = json as FeedbackData;
      setFeedback(feedbackData);

      // Save to history
      const historyItem: CoachHistoryItem = {
          id: Date.now().toString(),
          targetPhrase: targetPhrase,
          score: feedbackData.score,
          feedback: feedbackData,
          timestamp: new Date()
      };
      setHistory(prev => [historyItem, ...prev]);

    } catch (e) {
      console.error("Analysis error", e);
      setFeedback({
          score: 0,
          phonemes: "Analysis failed",
          feedback: "The AI could not process the audio response correctly. Please try again or record a shorter clip.",
          fix: "Ensure your mic is clear."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playNativeAudio = () => {
    if (!nativeAudioBuffer || !audioContextRef.current) return;
    
    if (isPlayingNative) {
        if (nativeSourceRef.current) {
            try { nativeSourceRef.current.stop(); } catch(e) {}
        }
        setIsPlayingNative(false);
        return;
    }

    // Stop user audio if playing
    if (isPlayingUser) {
        if (userSourceRef.current) {
            try { userSourceRef.current.stop(); } catch(e) {}
        }
        setIsPlayingUser(false);
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = nativeAudioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
        setIsPlayingNative(false);
        nativeSourceRef.current = null;
    };
    nativeSourceRef.current = source;
    source.start();
    setIsPlayingNative(true);
  };

  const playUserAudio = () => {
    if (!userAudioBuffer || !audioContextRef.current) return;
    
    if (isPlayingUser) {
        if (userSourceRef.current) {
            try { userSourceRef.current.stop(); } catch(e) {}
        }
        setIsPlayingUser(false);
        return;
    }

    // Stop native audio if playing
    if (isPlayingNative) {
        if (nativeSourceRef.current) {
            try { nativeSourceRef.current.stop(); } catch(e) {}
        }
        setIsPlayingNative(false);
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = userAudioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
        setIsPlayingUser(false);
        userSourceRef.current = null;
    };
    userSourceRef.current = source;
    source.start();
    setIsPlayingUser(true);
  };

  const loadHistoryItem = (item: CoachHistoryItem) => {
      stopAllAudio();
      setTargetPhrase(item.targetPhrase);
      setFeedback(item.feedback);
      setNativeAudioBuffer(null);
      setUserAudioBuffer(null);
      generateNativeAudio(item.targetPhrase.patois);
      setIsHistoryOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 max-w-2xl mx-auto pb-24 relative overflow-hidden">
      <div className="p-6 bg-white shadow-sm flex items-center justify-between">
         <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-green-600" /> Pronunciation Coach
            </h2>
            <p className="text-sm text-gray-500">Master your Patois accent</p>
         </div>
         
         <div className="flex gap-2">
             <button 
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100"
                title="Change Voice"
             >
                <Volume2 size={12} /> {selectedVoice}
             </button>

            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                title="History"
            >
                <History size={20} />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Challenge Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-500 relative overflow-hidden">
           {isGeneratingPhrase ? (
               <div className="flex flex-col items-center py-8 gap-3">
                   <Loader2 className="animate-spin text-green-600" size={32} />
                   <span className="text-sm text-gray-500">Finding a tricky phrase...</span>
               </div>
           ) : (
               <>
                 <div className="flex justify-between items-start mb-4">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">Challenge</span>
                    <button onClick={fetchNewPhrase} className="text-gray-400 hover:text-green-600 transition-colors">
                        <RefreshCw size={18} />
                    </button>
                 </div>
                 
                 <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                    {targetPhrase?.patois}
                 </h3>
                 <p className="text-gray-500 italic mb-6">"{targetPhrase?.english}"</p>

                 {/* Waveform Visualization Area */}
                 <div className="space-y-4 mb-6">
                    {/* Native Waveform */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                <Award size={12} /> Native Speaker
                             </span>
                             <button 
                                onClick={playNativeAudio}
                                disabled={!nativeAudioBuffer}
                                className={`p-2 rounded-full shadow-sm transition-all disabled:opacity-50 ${
                                    isPlayingNative 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                        : 'bg-white text-green-600 hover:scale-105'
                                }`}
                            >
                                {isPlayingNative ? <StopCircle size={16} /> : <Volume2 size={16} />}
                             </button>
                        </div>
                        <canvas ref={nativeCanvasRef} width={300} height={60} className="w-full h-16 rounded opacity-80" />
                    </div>

                    {/* User Waveform */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                <Mic size={12} /> Your Voice
                            </span>
                            <button 
                                onClick={playUserAudio}
                                disabled={!userAudioBuffer}
                                className={`p-2 rounded-full shadow-sm transition-all disabled:opacity-50 ${
                                    isPlayingUser 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                        : 'bg-white text-blue-600 hover:scale-105'
                                }`}
                            >
                                {isPlayingUser ? <StopCircle size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>
                        <canvas ref={userCanvasRef} width={300} height={60} className="w-full h-16 rounded opacity-80" />
                    </div>
                 </div>

                 {/* Controls */}
                 <div className="flex justify-center">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isAnalyzing}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 ${
                            isRecording 
                                ? 'bg-red-500 ring-4 ring-red-200 animate-pulse' 
                                : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                    >
                        {isRecording ? <Square size={32} className="text-white fill-current" /> : <Mic size={32} className="text-white" />}
                    </button>
                 </div>
                 
                 {isRecording && <p className="text-center text-xs text-red-500 font-bold mt-2 animate-pulse">Recording...</p>}
               </>
           )}
        </div>

        {/* Feedback Section */}
        {isAnalyzing && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
                <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Analyzing Pronunciation...</h3>
                <p className="text-sm text-gray-500">Checking phonemes, tone, and rhythm.</p>
            </div>
        )}

        {feedback && !isAnalyzing && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500 animate-in slide-in-from-bottom-6 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Analysis Result</h3>
                        <p className="text-sm text-gray-500">Here is how you did</p>
                    </div>
                    <div className={`relative w-16 h-16 flex items-center justify-center rounded-full border-4 font-bold text-xl ${
                        feedback.score >= 80 ? 'border-green-500 text-green-600' :
                        feedback.score >= 60 ? 'border-yellow-500 text-yellow-600' :
                        'border-red-500 text-red-600'
                    }`}>
                        {feedback.score}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                           <Activity size={16} /> Phoneme Check
                        </h4>
                        <p className="text-sm text-blue-700 leading-relaxed">{feedback.phonemes}</p>
                    </div>

                    <div className="bg-yellow-50 rounded-xl p-4">
                         <h4 className="text-sm font-bold text-yellow-800 mb-1 flex items-center gap-2">
                            <Zap size={16} /> Quick Fix
                         </h4>
                         <p className="text-sm text-yellow-800 font-medium">"{feedback.fix}"</p>
                    </div>

                    <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
                        {feedback.feedback}
                    </p>
                </div>
                
                <button 
                  onClick={fetchNewPhrase}
                  className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                    Next Challenge <ChevronRight size={18} />
                </button>
            </div>
        )}

      </div>
      
      <CoachHistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={loadHistoryItem}
        onClear={() => {
            if(window.confirm('Clear all practice history?')) setHistory([]);
        }}
      />
    </div>
  );
};
