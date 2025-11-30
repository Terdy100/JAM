
import React, { useState } from 'react';
import { Lesson, Module } from '../types';
import { INITIAL_LESSONS, COURSE_MODULES } from '../constants';
import { ArrowRight, Star, CheckCircle, RefreshCw, Lock, Award, Download, Share2, BookOpen, GraduationCap, Copy, Check } from 'lucide-react';

interface LessonsViewProps {
  onStartLesson: (lesson: Lesson) => void;
  completedLessonIds: string[];
}

export const LessonsView: React.FC<LessonsViewProps> = ({ onStartLesson, completedLessonIds }) => {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'certificate'>('curriculum');
  const [userName, setUserName] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  // Calculate Progress
  const totalLessons = INITIAL_LESSONS.length;
  const completedCount = completedLessonIds.length;
  const progressPercentage = Math.round((completedCount / totalLessons) * 100);
  const isCertified = completedCount >= totalLessons; 

  // Helper to check if a module is locked
  const isModuleLocked = (moduleOrder: number) => {
    if (moduleOrder === 1) return false;
    // Find previous module
    const prevModule = COURSE_MODULES.find(m => m.order === moduleOrder - 1);
    if (!prevModule) return false;
    
    // Check if all lessons in prev module are completed
    const prevModuleLessons = INITIAL_LESSONS.filter(l => l.moduleId === prevModule.id);
    const completedInPrev = prevModuleLessons.every(l => completedLessonIds.includes(l.id));
    
    return !completedInPrev;
  };

  const handleDownload = () => {
    // Since window.print() is often blocked in sandboxes, we generate a standalone HTML file
    const safeName = userName || 'Student';
    const dateStr = new Date().toLocaleDateString();
    const whatsappLink = "https://wa.me/233551389510?text=I%20am%20interested%20in%20learning%20Patois!";
    // Using a reliable public API for the QR code image
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(whatsappLink)}&color=15803d`;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JamTalk Certificate - ${safeName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f0fdf4;
            font-family: 'Times New Roman', serif;
        }
        .cert-container {
            width: 900px;
            height: 640px;
            background-color: #fffdf5;
            border: 8px double #ca8a04;
            padding: 40px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            position: relative;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
        }
        .header {
            border-bottom: 2px solid rgba(202,138,4,0.2);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 48px;
            font-weight: bold;
            color: #a16207;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 0;
        }
        .subtitle {
            font-size: 18px;
            color: rgba(133,77,14,0.6);
            text-transform: uppercase;
            letter-spacing: 0.2em;
            margin-top: 5px;
        }
        .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .certifies {
            color: #6b7280;
            font-style: italic;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .name {
            font-size: 56px;
            font-weight: bold;
            color: #111827;
            border-bottom: 2px solid #d1d5db;
            padding-bottom: 10px;
            margin: 10px 40px 30px 40px;
            min-width: 400px;
        }
        .completion-text {
            color: #4b5563;
            font-size: 20px;
            line-height: 1.5;
        }
        .course-name {
            font-weight: bold;
            color: #15803d;
            font-size: 28px;
            display: block;
            margin-top: 10px;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid rgba(202,138,4,0.2);
            padding-top: 30px;
        }
        .sig-line {
            text-align: left;
        }
        .sig-line.right {
            text-align: right;
        }
        .line {
            width: 200px;
            border-bottom: 1px solid #9ca3af;
            margin-bottom: 8px;
        }
        .label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            font-family: sans-serif;
        }
        .value {
            font-size: 18px;
            color: #1f2937;
            font-family: cursive;
        }
        .seal {
            width: 80px;
            height: 80px;
            background-color: #ca8a04;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border: 4px solid #fff;
            outline: 2px solid #ca8a04;
        }
        .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        .qr-code {
            width: 80px;
            height: 80px;
            border: 4px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .qr-label {
            font-size: 10px;
            color: #15803d;
            font-family: sans-serif;
            font-weight: bold;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="cert-container">
        <div class="header">
            <h1 class="title">Certificate</h1>
            <div class="subtitle">Of Completion</div>
        </div>
        
        <div class="content">
            <div class="certifies">This certifies that</div>
            <div class="name">${safeName}</div>
            <div class="completion-text">
                Has successfully completed the
                <span class="course-name">JamTalk Patois Course</span>
            </div>
        </div>

        <div class="footer">
            <div class="sig-line">
                <div class="value">${dateStr}</div>
                <div class="line"></div>
                <div class="label">Date</div>
            </div>

            <div class="qr-section">
                <img src="${qrCodeUrl}" alt="Scan to Contact" class="qr-code">
                <div class="qr-label">Scan to Connect</div>
            </div>

            <div class="sig-line right">
                <div class="value" style="color: #166534; font-weight: bold;">Aunty Gem</div>
                <div class="line"></div>
                <div class="label">Instructor</div>
            </div>
        </div>
    </div>
    <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 1000); };
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JamTalk_Certificate_${safeName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareText = `I just earned my Certified Patois Speaker certificate on JamTalk! Big up! 🇯🇲🎓\nConnect with us: https://wa.me/233551389510`;
    
    const shareData = {
        title: 'JamTalk Certificate',
        text: shareText,
        url: "https://wa.me/233551389510" // Adding the URL explicitly helps some share targets
    };

    // Try native share first
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            console.log('Native share cancelled or failed:', err);
        }
    }

    // Fallback: Copy to clipboard
    try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 3000);
    } catch (err) {
        // Last resort fallback if clipboard fails (rare, but possible in some frames)
        alert("Copy failed. Please manually share: +233551389510");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* Top Navigation Tabs */}
      <div className="bg-white border-b border-gray-100 p-2 sticky top-0 z-20">
         <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
               onClick={() => setActiveTab('curriculum')}
               className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                   activeTab === 'curriculum' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-600'
               }`}
            >
               <BookOpen size={16} /> Course
            </button>
            <button
               onClick={() => setActiveTab('certificate')}
               className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                   activeTab === 'certificate' 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-600'
               }`}
            >
               <Award size={16} /> Certificate
               {isCertified && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-24 max-w-2xl mx-auto space-y-6 flex-1 overflow-y-auto w-full">
        
        {/* === CURRICULUM TAB === */}
        {activeTab === 'curriculum' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              {/* Progress Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold">Your Progress</h1>
                    <span className="font-mono text-sm opacity-80">{completedCount}/{totalLessons} Lessons</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full bg-white/90 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <p className="text-xs opacity-90">
                    {progressPercentage === 100 
                        ? "Congratulations! You've completed the course!" 
                        : "Keep going! Complete all lessons to get certified."}
                </p>
              </div>

              {/* Modules List */}
              <div className="space-y-8">
                 {COURSE_MODULES.map((module) => {
                     const isLocked = isModuleLocked(module.order);
                     const moduleLessons = INITIAL_LESSONS.filter(l => l.moduleId === module.id);
                     const completedInModule = moduleLessons.filter(l => completedLessonIds.includes(l.id)).length;
                     
                     return (
                         <div key={module.id} className={`relative ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                             <div className="flex items-center gap-3 mb-4">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                     isLocked ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                                 }`}>
                                     {module.order}
                                 </div>
                                 <div>
                                     <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                         {module.title}
                                         {isLocked && <Lock size={14} className="text-gray-400" />}
                                     </h2>
                                     <p className="text-xs text-gray-500">{module.description}</p>
                                 </div>
                             </div>

                             <div className="grid gap-3 pl-4 border-l-2 border-gray-100 ml-4">
                                 {moduleLessons.map((lesson) => {
                                     const isCompleted = completedLessonIds.includes(lesson.id);
                                     
                                     return (
                                         <div 
                                            key={lesson.id}
                                            onClick={() => !isLocked && onStartLesson(lesson)}
                                            className={`relative bg-white rounded-xl p-4 border transition-all ${
                                                isLocked 
                                                    ? 'border-gray-100 cursor-not-allowed' 
                                                    : isCompleted 
                                                        ? 'border-green-200 bg-green-50 cursor-pointer hover:shadow-md' 
                                                        : 'border-gray-200 cursor-pointer hover:border-green-300 hover:shadow-md'
                                            }`}
                                         >
                                             <div className="flex justify-between items-start">
                                                 <div className="flex gap-4">
                                                     <div className="text-2xl pt-1">{lesson.emoji}</div>
                                                     <div>
                                                         <h3 className={`font-bold ${isCompleted ? 'text-green-900' : 'text-gray-800'}`}>
                                                             {lesson.title}
                                                         </h3>
                                                         <div className="flex flex-wrap gap-1 mt-1">
                                                             {lesson.topics.slice(0, 2).map(t => (
                                                                 <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                                                                     {t}
                                                                 </span>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 </div>
                                                 
                                                 {isLocked ? (
                                                     <Lock size={16} className="text-gray-300 mt-2" />
                                                 ) : isCompleted ? (
                                                     <CheckCircle size={20} className="text-green-500 mt-1" />
                                                 ) : (
                                                     <div className="mt-2 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                                         <ArrowRight size={14} className="text-green-600" />
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
              </div>
           </div>
        )}

        {/* === CERTIFICATE TAB === */}
        {activeTab === 'certificate' && (
            <div className="animate-in slide-in-from-right duration-300">
                {!isCertified ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 relative">
                            <Lock size={48} className="text-gray-400" />
                            <div className="absolute -bottom-2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full">
                                Locked
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Certificate Locked</h2>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            Complete all {totalLessons} lessons in the curriculum to verify your skills and unlock your official Patois Speaker certificate.
                        </p>
                        
                        <div className="w-full max-w-xs bg-gray-200 h-4 rounded-full overflow-hidden mt-6">
                            <div 
                                className="h-full bg-green-500 transition-all duration-1000"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-green-600">{progressPercentage}% Completed</span>
                        
                        <button 
                           onClick={() => setActiveTab('curriculum')}
                           className="mt-8 text-green-600 font-medium hover:underline"
                        >
                            Return to Lessons
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-6">
                        <div className="text-center space-y-2">
                             <h2 className="text-2xl font-bold text-gray-900">Congratulations! 🎉</h2>
                             <p className="text-gray-600">You have officially mastered the basics of Jamaican Patois.</p>
                        </div>

                        {/* Certificate Card */}
                        <div className="relative w-full aspect-[1.4] bg-[#fffdf5] border-8 border-double border-yellow-600 p-8 shadow-2xl rounded-lg text-center flex flex-col items-center justify-between overflow-hidden">
                            {/* Watermark/Background */}
                            <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
                                <GraduationCap size={200} />
                            </div>
                            
                            {/* Header */}
                            <div className="relative z-10 w-full border-b-2 border-yellow-600/20 pb-4 mb-2">
                                <div className="text-3xl font-serif text-yellow-700 font-bold tracking-widest uppercase mb-1">Certificate</div>
                                <div className="text-sm font-serif text-yellow-800/60 uppercase tracking-wide">Of Completion</div>
                            </div>

                            {/* Body */}
                            <div className="relative z-10 flex-1 flex flex-col justify-center w-full py-4">
                                <p className="text-gray-500 italic font-serif mb-4">This certifies that</p>
                                
                                {userName ? (
                                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4 mx-8">
                                        {userName}
                                    </h3>
                                ) : (
                                    <input 
                                        type="text" 
                                        placeholder="Enter Your Name"
                                        className="text-2xl sm:text-3xl font-serif font-bold text-center bg-transparent border-b border-gray-300 pb-2 mb-4 mx-8 outline-none placeholder-gray-300 hover:bg-yellow-50 focus:border-yellow-500 transition-colors w-3/4 mx-auto"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                    />
                                )}

                                <p className="text-gray-600 font-serif">
                                    Has successfully completed the<br/>
                                    <span className="font-bold text-green-700">JamTalk Patois Course</span>
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="relative z-10 w-full flex justify-between items-end pt-4 border-t border-yellow-600/20 mt-2">
                                <div className="text-left">
                                    <div className="w-24 border-b border-gray-400 mb-1"></div>
                                    <div className="text-[10px] text-gray-400 uppercase">Date</div>
                                    <div className="text-xs font-serif">{new Date().toLocaleDateString()}</div>
                                </div>
                                
                                <div className="w-16 h-16 relative">
                                    {/* Seal */}
                                    <div className="absolute inset-0 bg-yellow-600 rounded-full flex items-center justify-center text-white shadow-md">
                                        <Star size={24} className="fill-current" />
                                    </div>
                                    <div className="absolute inset-1 border border-white rounded-full opacity-50"></div>
                                </div>

                                <div className="text-right">
                                    <div className="w-24 border-b border-gray-400 mb-1"></div>
                                    <div className="text-[10px] text-gray-400 uppercase">Instructor</div>
                                    <div className="text-xs font-serif font-bold text-green-800">Aunty Gem</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 w-full max-w-sm">
                            <button 
                                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                                onClick={handleDownload}
                            >
                                <Download size={18} /> Download
                            </button>
                            {/* Share button */}
                            <button 
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                                    shareStatus === 'copied'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                onClick={handleShare}
                            >
                                {shareStatus === 'copied' ? (
                                    <>
                                        <Check size={18} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Share2 size={18} /> Share
                                    </>
                                )}
                            </button>
                        </div>
                        {shareStatus === 'copied' && (
                            <p className="text-xs text-green-600 font-medium animate-in fade-in slide-in-from-top-1">
                                Link copied to clipboard!
                            </p>
                        )}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
