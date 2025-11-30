import React, { useState, useRef } from 'react';
import { Mic, Search, Music, Loader2, StopCircle, Disc } from 'lucide-react';
import { ai } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { arrayBufferToBase64 } from '../utils/audio';

export const MusicLyricsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'listen' | 'search'>('listen');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lyricsResult, setLyricsResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setLyricsResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Use webm for upload
        await analyzeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please enable permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/webm', // Or audio/mp3 based on blob
                data: base64Audio
              }
            },
            {
              text: `Please listen to this audio clip. It is likely a Dancehall or Reggae song. 
              1. Identify the song and artist if possible.
              2. Transcribe the lyrics exactly in authentic Jamaican Patois.
              3. Provide a standard English translation for the main chorus or hook.
              4. List 3 key slang terms used in the song and define them.
              
              Format the output cleanly with bold headers.`
            }
          ]
        }
      });

      setLyricsResult(response.text);

    } catch (error) {
      console.error("Analysis error:", error);
      setLyricsResult("Sorry, I couldn't process that audio. Please try again or search for the song manually.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setLyricsResult(null);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find the lyrics for the Dancehall/Reggae song: "${searchQuery}".
        1. Write the lyrics in authentic Jamaican Patois.
        2. Provide a standard English translation side-by-side or below for key sections.
        3. Explain any cultural references or deep slang.
        
        Format the output cleanly with bold headers.`
      });

      setLyricsResult(response.text);
    } catch (error) {
      console.error("Search error:", error);
      setLyricsResult("Could not find lyrics for that song. Try checking the spelling.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white max-w-2xl mx-auto pb-24 min-h-screen">
      
      {/* Header */}
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-green-500 to-yellow-400 bg-clip-text text-transparent flex items-center gap-2">
          <Music className="text-yellow-500" /> Riddim & Lyrics
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Play a song to get the lyrics or search for your favorite tune.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex px-6 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('listen')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'listen' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Listen & Identify
          {activeTab === 'listen' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'search' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Search Lyrics
          {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 rounded-t-full" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {/* Listen Mode */}
        {activeTab === 'listen' && (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-8 animate-in fade-in duration-500">
            {!lyricsResult && !isLoading && (
              <>
                 <div className="relative">
                    <div className={`absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-20 ${isRecording ? 'animate-pulse scale-150' : ''}`}></div>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-2xl ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-900' 
                          : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      {isRecording ? <StopCircle size={40} className="text-white" /> : <Mic size={40} className="text-yellow-400" />}
                    </button>
                 </div>
                 <p className="text-center text-gray-400 font-medium">
                   {isRecording ? 'Listening... Play the song now!' : 'Tap the mic and play a Dancehall song'}
                 </p>
                 {isRecording && (
                    <div className="flex items-center gap-1 h-8">
                       {[1,2,3,4,5].map(i => (
                         <div key={i} className="w-1 bg-yellow-500 animate-bounce" style={{ height: `${Math.random() * 20 + 10}px`, animationDelay: `${i * 0.1}s` }}></div>
                       ))}
                    </div>
                 )}
              </>
            )}
          </div>
        )}

        {/* Search Mode */}
        {activeTab === 'search' && !lyricsResult && !isLoading && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Toast - Koffee"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find Lyrics
            </button>
            
            <div className="mt-8 text-center text-gray-600">
               <Disc size={48} className="mx-auto mb-4 opacity-20" />
               <p className="text-sm">Search for any Reggae or Dancehall track to learn the lyrics.</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
           <div className="flex flex-col items-center justify-center py-20 space-y-4">
             <Loader2 size={40} className="text-green-500 animate-spin" />
             <p className="text-gray-400 text-sm animate-pulse">
               {activeTab === 'listen' ? 'Analyzing rhythm and lyrics...' : 'Digging through the crates...'}
             </p>
           </div>
        )}

        {/* Results */}
        {lyricsResult && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-yellow-400 prose-strong:text-green-400">
                   <ReactMarkdown>{lyricsResult}</ReactMarkdown>
                </div>
             </div>
             
             <button 
               onClick={() => { setLyricsResult(null); setIsRecording(false); }}
               className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 font-medium transition-colors"
             >
               Start Over
             </button>
          </div>
        )}
      </div>
    </div>
  );
};