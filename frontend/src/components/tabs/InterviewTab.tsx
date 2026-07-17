"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Briefcase, Mic, MicOff, ChevronRight, X,
  CheckCircle, History, BarChart2, Volume2, VolumeX, Trophy,
  MessageSquare, Send, RotateCcw
} from "lucide-react";
import { InterviewQuestion, CompanyBrief, MockInterviewSession } from "@/types";

/* ── Types ── */
interface VoiceFeedback {
  question: string;
  answer: string;
  feedback: string;
  score: number;
}

interface InterviewTabProps {
  interviewJobTitle: string;
  setInterviewJobTitle: (val: string) => void;
  interviewCompany: string;
  setInterviewCompany: (val: string) => void;
  interviewJobDesc: string;
  setInterviewJobDesc: (val: string) => void;
  handleGenerateQuestions: () => void;
  handleGenerateBrief: () => void;
  isLoadingInterview: boolean;
  isLoadingBrief: boolean;
  interviewQuestions: InterviewQuestion[];
  companyBrief: CompanyBrief | null;
}

/* ── Web Speech API type declarations ── */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/* ── Score color helper ── */
function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-amber-500";
  return "text-rose-500";
}
function scoreBg(score: number) {
  if (score >= 8) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 6) return "bg-amber-500/10 border-amber-500/30";
  return "bg-rose-500/10 border-rose-500/30";
}

export function InterviewTab({
  interviewJobTitle,
  setInterviewJobTitle,
  interviewCompany,
  setInterviewCompany,
  interviewJobDesc,
  setInterviewJobDesc,
  handleGenerateQuestions,
  handleGenerateBrief,
  isLoadingInterview,
  isLoadingBrief,
  interviewQuestions,
  companyBrief,
}: InterviewTabProps) {
  /* ── Voice Interview State ── */
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [qaHistory, setQaHistory] = useState<VoiceFeedback[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<VoiceFeedback | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);

  /* ── History State ── */
  const [pastSessions, setPastSessions] = useState<MockInterviewSession[]>([]);
  const [progressSummary, setProgressSummary] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  /* ── Load history on mount ── */
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiFetch("/api/interview/history");
      if (res.ok) {
        const data = await res.json();
        setPastSessions(data.sessions || []);
        setProgressSummary(data.progress_summary || null);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /* ── TTS: Speak text ── */
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Google US English") || v.name.includes("Daniel")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  /* ── STT: Start recording ── */
  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Your browser doesn't support Speech Recognition. Please use Chrome or Edge.");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setTranscript(prev => prev + final + (interim ? ` ${interim}` : ""));
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  /* ── Start a new voice session ── */
  const startVoiceInterview = async () => {
    if (!interviewJobTitle || !interviewCompany) {
      alert("Please enter a job title and company first.");
      return;
    }
    setIsStartingSession(true);
    setQaHistory([]);
    setLatestFeedback(null);
    setInterviewComplete(false);
    setOverallScore(null);
    setTranscript("");
    setQuestionNumber(1);

    try {
      const res = await apiFetch("/api/interview/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: interviewJobTitle,
          company: interviewCompany,
          job_description: interviewJobDesc,
        }),
      });
      if (!res.ok) throw new Error("Failed to start session.");
      const data = await res.json();
      setActiveSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setIsVoiceMode(true);
      // Speak the opening question after a short delay
      setTimeout(() => speak(data.question), 500);
    } catch (e) {
      alert("Could not start interview session. Please try again.");
    } finally {
      setIsStartingSession(false);
    }
  };

  /* ── Submit answer to backend ── */
  const submitAnswer = async () => {
    if (!transcript.trim()) {
      alert("Please record your answer first.");
      return;
    }
    if (isRecording) stopRecording();
    setIsEvaluating(true);

    try {
      const res = await apiFetch("/api/interview/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId,
          answer: transcript.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to evaluate answer.");
      const data = await res.json();

      const record: VoiceFeedback = {
        question: currentQuestion,
        answer: transcript.trim(),
        feedback: data.feedback,
        score: data.score,
      };
      setQaHistory(prev => [...prev, record]);
      setLatestFeedback(record);
      setTranscript("");

      if (data.is_complete) {
        // Interview done
        setInterviewComplete(true);
        if (data.score && qaHistory.length > 0) {
          const all = [...qaHistory, record];
          setOverallScore(Math.round(all.reduce((a, b) => a + b.score, 0) / all.length));
        }
        speak(`Great job completing the interview! ${data.feedback} Your session has been saved.`, () => {
          fetchHistory();
        });
      } else {
        // Speak feedback, then ask next question
        const toSpeak = `${data.feedback} Here's your next question: ${data.next_question}`;
        speak(toSpeak, () => {
          setCurrentQuestion(data.next_question);
          setQuestionNumber(prev => prev + 1);
        });
      }
    } catch (e) {
      alert("Failed to evaluate your answer. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  /* ── End interview ── */
  const endInterview = () => {
    stopRecording();
    window.speechSynthesis?.cancel();
    setIsVoiceMode(false);
    setActiveSessionId(null);
    setTranscript("");
    setCurrentQuestion("");
    setLatestFeedback(null);
    setInterviewComplete(false);
    fetchHistory();
  };

  return (
    <div className="animate-[fadeUp_0.5s_ease-out]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Interview Prep</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate questions, research companies, or practice with a real AI voice interview.
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-border text-muted-foreground hover:bg-card/60 transition-all"
        >
          <History className="w-3.5 h-3.5" />
          History {pastSessions.length > 0 && `(${pastSessions.length})`}
        </button>
      </div>

      {/* ── History Panel ── */}
      {showHistory && (
        <div className="mb-6 bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Past Interview Sessions
          </h3>
          {isLoadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              Loading history...
            </div>
          ) : pastSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No past sessions yet. Complete a voice interview to see your history here.</p>
          ) : (
            <div className="space-y-3">
              {progressSummary && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">AI Progress Report</p>
                  <p className="text-sm text-foreground/90">{progressSummary}</p>
                </div>
              )}
              {pastSessions.map((s) => (
                <div key={s.session_id} className="flex items-center justify-between p-3 bg-card/50 border border-border/50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.job_title} <span className="text-muted-foreground font-normal">at</span> {s.company}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}{s.qa_count} question{s.qa_count !== 1 ? "s" : ""} answered
                    </p>
                  </div>
                  {s.overall_score != null && (
                    <div className={`px-3 py-1 rounded-lg border text-sm font-bold ${scoreBg(s.overall_score)} ${scoreColor(s.overall_score)}`}>
                      {s.overall_score}/10
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Setup Form ── */}
      {!isVoiceMode && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Job Title</label>
              <input
                type="text"
                value={interviewJobTitle}
                onChange={(e) => setInterviewJobTitle(e.target.value)}
                placeholder="e.g. Senior AI Engineer"
                className="w-full bg-card border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company</label>
              <input
                type="text"
                value={interviewCompany}
                onChange={(e) => setInterviewCompany(e.target.value)}
                placeholder="e.g. Google"
                className="w-full bg-card border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Job Description (optional, improves results)</label>
            <textarea
              value={interviewJobDesc}
              onChange={(e) => setInterviewJobDesc(e.target.value)}
              placeholder="Paste the full job description here for best results..."
              rows={3}
              className="w-full bg-card border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateQuestions}
              disabled={isLoadingInterview}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoadingInterview ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Questions</>
              )}
            </button>
            <button
              onClick={handleGenerateBrief}
              disabled={isLoadingBrief}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all disabled:opacity-50"
            >
              {isLoadingBrief ? (
                <><div className="w-4 h-4 rounded-full border-2 border-slate-400/30 border-t-slate-400 animate-spin" /> Researching...</>
              ) : (
                <><Briefcase className="w-4 h-4" /> Company Brief</>
              )}
            </button>
            <button
              onClick={startVoiceInterview}
              disabled={isStartingSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isStartingSession ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Starting...</>
              ) : (
                <><Mic className="w-4 h-4" /> Start Voice Interview</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Voice Interview Overlay ── */}
      {isVoiceMode && (
        <div className="mb-6">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500/50 animate-ping" />
              </div>
              <span className="text-sm font-bold text-foreground">Live Mock Interview</span>
              <span className="text-xs text-muted-foreground">
                · Q{questionNumber} · {interviewJobTitle} at {interviewCompany}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl border border-border hover:bg-card/60 transition-all"
                title={isMuted ? "Unmute AI" : "Mute AI"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                onClick={endInterview}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all"
              >
                <X className="w-3.5 h-3.5" /> End Interview
              </button>
            </div>
          </div>

          {/* Interview Complete State */}
          {interviewComplete ? (
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
              <Trophy className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-foreground mb-2">Interview Complete!</h3>
              {overallScore != null && (
                <div className={`text-4xl font-black mb-3 ${scoreColor(overallScore)}`}>
                  {overallScore}<span className="text-lg font-normal text-muted-foreground">/10</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">Your session has been saved. View your full history above.</p>
              <div className="space-y-3 text-left max-h-64 overflow-y-auto">
                {qaHistory.map((qa, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${scoreBg(qa.score)}`}>
                    <p className="text-xs font-bold text-muted-foreground mb-1">Q{i + 1}: {qa.question}</p>
                    <p className="text-xs text-foreground/70 italic mb-1.5">"{qa.answer.slice(0, 120)}{qa.answer.length > 120 ? "..." : ""}"</p>
                    <p className="text-xs text-foreground/90">{qa.feedback}</p>
                    <span className={`text-xs font-bold ${scoreColor(qa.score)}`}>Score: {qa.score}/10</span>
                  </div>
                ))}
              </div>
              <button
                onClick={endInterview}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Done
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Main Interview Panel */}
              <div className="lg:col-span-3 space-y-4">
                {/* Current Question */}
                <div className={`bg-card/40 backdrop-blur-2xl border rounded-2xl p-6 shadow-sm transition-all ${isSpeaking ? "border-blue-400/50 shadow-blue-500/10" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Question {questionNumber}</span>
                    {isSpeaking && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-semibold ml-auto">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        AI Speaking
                      </span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground leading-relaxed">{currentQuestion}</p>
                  <button
                    onClick={() => speak(currentQuestion)}
                    className="mt-3 text-xs text-muted-foreground hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" /> Replay question
                  </button>
                </div>

                {/* Answer Box */}
                <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Answer</span>
                    {/* Mic button */}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isEvaluating || isSpeaking}
                      className={`relative p-3 rounded-full transition-all ${
                        isRecording
                          ? "bg-red-500 shadow-lg shadow-red-500/40 scale-110"
                          : "bg-card border border-border hover:border-blue-400/50 hover:bg-blue-500/5"
                      } disabled:opacity-50`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5 text-white" />
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                        </>
                      ) : (
                        <Mic className={`w-5 h-5 ${isRecording ? "text-white" : "text-muted-foreground"}`} />
                      )}
                    </button>
                  </div>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={isRecording ? "🎤 Listening... speak your answer" : "Click the mic and speak, or type your answer here"}
                    rows={4}
                    className={`w-full bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/50 transition-all ${
                      isRecording ? "placeholder:text-red-400/60" : ""
                    }`}
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{transcript.length} chars</span>
                    <button
                      onClick={submitAnswer}
                      disabled={!transcript.trim() || isEvaluating || isSpeaking}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {isEvaluating ? (
                        <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Evaluating...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Submit Answer</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Side Panel: Latest Feedback + Q History */}
              <div className="lg:col-span-2 space-y-4">
                {latestFeedback && (
                  <div className={`border rounded-2xl p-5 shadow-sm ${scoreBg(latestFeedback.score)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Feedback</span>
                      <span className={`text-lg font-black ${scoreColor(latestFeedback.score)}`}>{latestFeedback.score}/10</span>
                    </div>
                    <p className="text-sm text-foreground/90">{latestFeedback.feedback}</p>
                  </div>
                )}

                {qaHistory.length > 0 && (
                  <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</span>
                    </div>
                    <div className="space-y-2">
                      {qaHistory.map((qa, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-6">Q{i + 1}</span>
                          <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                qa.score >= 8 ? "bg-emerald-500" : qa.score >= 6 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${qa.score * 10}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${scoreColor(qa.score)}`}>{qa.score}/10</span>
                        </div>
                      ))}
                    </div>
                    {qaHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Avg Score</span>
                        <span className={`text-sm font-black ${scoreColor(Math.round(qaHistory.reduce((a, b) => a + b.score, 0) / qaHistory.length))}`}>
                          {(qaHistory.reduce((a, b) => a + b.score, 0) / qaHistory.length).toFixed(1)}/10
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tips */}
                <div className="bg-card/20 border border-border/50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Interview Tips</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex gap-2"><span>🎯</span> Use the STAR method for behavioral questions</li>
                    <li className="flex gap-2"><span>⏱️</span> Aim for 90–120 second answers</li>
                    <li className="flex gap-2"><span>🔢</span> Back up claims with specific numbers</li>
                    <li className="flex gap-2"><span>🎤</span> Speak clearly and at a measured pace</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Static Questions + Company Brief (existing) ── */}
      {!isVoiceMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interview Questions */}
          {interviewQuestions.length > 0 && (
            <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Likely Interview Questions</h3>
              <div className="space-y-4">
                {interviewQuestions.map((q, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md mb-1.5 ${
                      q.type === "technical" ? "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" :
                      q.type === "behavioral" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" :
                      "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}>{q.type}</span>
                    <p className="text-sm font-semibold text-foreground mb-1">{q.question}</p>
                    <p className="text-xs text-muted-foreground italic">💡 {q.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company Brief */}
          {companyBrief && (
            <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Company Research Brief — {interviewCompany}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-500 uppercase mb-1">Overview</h4>
                  <p className="text-sm text-foreground/90">{companyBrief.overview}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase mb-1">Culture</h4>
                  <p className="text-sm text-foreground/90">{companyBrief.culture}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-violet-500 uppercase mb-1">Recent News</h4>
                  <ul className="space-y-1">{companyBrief.recentNews.map((n, i) => <li key={i} className="text-sm text-slate-600 dark:text-muted-foreground flex gap-2"><span>•</span>{n}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase mb-1">Interview Tips</h4>
                  <ul className="space-y-1">{companyBrief.interviewTips.map((t, i) => <li key={i} className="text-sm text-slate-600 dark:text-muted-foreground flex gap-2"><span>💡</span>{t}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-500 uppercase mb-1">Glassdoor Sentiment</h4>
                  <p className="text-sm text-foreground/90">{companyBrief.glassdoorSentiment}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helper: API fetch with session header ── */
function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof window !== "undefined") {
    const id = localStorage.getItem("jobhunt_session_id") || "";
    if (id) headers.set("X-User-ID", id);
  }
  return fetch(url, { ...options, headers });
}
