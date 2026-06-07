"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  Calendar, 
  ChevronRight, 
  Info, 
  AlertCircle,
  Play,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface for chat bubble messages
interface Message {
  id: string;
  role: "user" | "tutor";
  text: string; // The English dialogue output
  translation?: string; // Portuguese translation of tutor's reply
  correction?: string; // Grammar coach's feedback
  audioBase64?: string; // The synthetic voice from Gemini Live preview
  isSpoken?: boolean; // Label indicating if user spoke this message
}

// 24 Hour lesson schedule topics
const LESSON_TOPICS = [
  { hour: 0, topic: "Night Owl Chats", desc: "Talking about dreams, sleep routines, and midnight snacks.", level: "Iniciante" },
  { hour: 1, topic: "Galactic Adventures", desc: "Vocabulary for space flight, sci-fi movies, and alien worlds.", level: "Avançado" },
  { hour: 2, topic: "Planos para o Futuro", desc: "Using 'gonna' and 'will' to discuss career ambitions.", level: "Intermediário" },
  { hour: 3, topic: "Filosofia de Vida", desc: "Diving into basic moral questions and expressing opinions safely.", level: "Avançado" },
  { hour: 4, topic: "Culinária e Café da Manhã", desc: "Learning how to describe continental breakfasts and recipes.", level: "Iniciante" },
  { hour: 5, topic: "Rotinas Saudáveis", desc: "Vocabulary about fitness, meditation, sleeping patterns, and gym.", level: "Intermediário" },
  { hour: 6, topic: "Caminho para o Trabalho", desc: "Describing traffic, navigation, and subway transit in New York.", level: "Iniciante" },
  { hour: 7, topic: "Pedindo Café Especial", desc: "Ordering cappuccinos, lattes, and customized pastries at Starbucks.", level: "Iniciante" },
  { hour: 8, topic: "Entrevista de Emprego", desc: "Answering 'Tell me about yourself' and pitching your skills professionally.", level: "Avançado" },
  { hour: 9, topic: "Apresentação de Projetos", desc: "Leading slides, handling questions, and explaining quarterly charts.", level: "Avançado" },
  { hour: 10, topic: "Almoço com Colegas", desc: "Splitting the bill, tipping etiquette in the USA, and small talk.", level: "Iniciante" },
  { hour: 11, topic: "Tecnologia e Redes Sociais", desc: "Debating artificial intelligence, screen time limits, and code.", level: "Intermediário" },
  { hour: 12, topic: "Check-in no Hotel", desc: "Dealing with reservations, room keys, and asking for visual guides.", level: "Iniciante" },
  { hour: 13, topic: "Embarque no Aeroporto", desc: "Luggage checking, passing customs security, and reading flight screens.", level: "Iniciante" },
  { hour: 14, topic: "Passando na Imigração", desc: "Answering agent questions about trip purpose, duration, and stays.", level: "Intermediário" },
  { hour: 15, topic: "Comprando Roupas na Quinta Avenida", desc: "Asking for sizes, testing fits, requesting discounts, and refunds.", level: "Iniciante" },
  { hour: 16, topic: "Consulta de Médica de Emergência", desc: "Explaining physical symptoms, pain levels, and buying medicine.", level: "Intermediário" },
  { hour: 17, topic: "Happy Hour no Pub", desc: "Socializing after hours, praising cocktails, and talking about leisure.", level: "Intermediário" },
  { hour: 18, topic: "Cozinhando em Família", desc: "Describing tastes, measuring ingredients, and commenting on meals.", level: "Iniciante" },
  { hour: 19, topic: "Discussão de Filmes e Podcasts", desc: "Reviewing script writing, actors, sound templates, and ratings.", level: "Intermediário" },
  { hour: 20, topic: "Jantar Romântico", desc: "Making table reservations, complementing the chef, and visual themes.", level: "Avançado" },
  { hour: 21, topic: "Planejando Viagem de Fim de Semana", desc: "Booking Airbnb accommodation and talking about sports gear.", level: "Intermediário" },
  { hour: 22, topic: "Leitura de Literatura", desc: "Discussing modern bestsellers and sharing novel descriptions.", level: "Avançado" },
  { hour: 23, topic: "Reflexão sobre Gratidão", desc: "Expressing things you are grateful for today and weekend plans.", level: "Iniciante" }
];

export default function Home() {
  const [currentHour, setCurrentHour] = useState<number>(10);

  const [level, setLevel] = useState<"Iniciante" | "Intermediário" | "Avançado">("Iniciante");
  const [voice, setVoice] = useState<"Kore" | "Zephyr">("Kore");
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [sessionActive, setSessionActive] = useState<boolean>(true);

  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes static default

  // Supabase states
  const [activeSidebarTab, setActiveSidebarTab] = useState<"agenda" | "history">("agenda");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);

  // Load saved sessions from Supabase
  const loadSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setPastSessions(data.sessions || []);
        setDbConfigured(!!data.dbConfigured);
      }
    } catch (e) {
      console.warn("Could not query Supabase sessions:", e);
    }
  };

  const loadSessionMessages = async (sid: string) => {
    try {
      setIsLoading(true);
      setErrorText("");
      const res = await fetch(`/api/messages?sessionId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          setSessionId(sid);
          
          // Try to restore session metadata if we have it
          const matchedSess = pastSessions.find(s => s.id === sid);
          if (matchedSess) {
            setCurrentHour(matchedSess.createdHour);
            setLevel(matchedSess.level);
            setVoice(matchedSess.voice);
          }
        } else {
          setErrorText("A aula selecionada não possui mensagens.");
        }
      } else {
        setErrorText("Não foi possível obter as mensagens desta aula.");
      }
    } catch (e) {
      console.error("Failed to load past session messages", e);
      setErrorText("Não foi possível carregar o histórico desta aula.");
    } finally {
      setIsLoading(false);
    }
  };

  // Track unique serial message IDs purely, avoiding Date.now() impure lookups during render checkups
  const messageCounterRef = useRef<number>(1);

  const [messages, setMessages] = useState<Message[]>(() => {
    const targetTopic = LESSON_TOPICS.find(l => l.hour === 10) || LESSON_TOPICS[10];
    const welcomeMsg = `Hello! Welcome to our hourly lesson on "${targetTopic.topic}". I am Teacher Gem Coach, your personal tutor with a premium female voice from Gemini. What is your goal in our 15-minute speaking practice today?`;
    
    return [
      {
        id: "sys-0",
        role: "tutor",
        text: welcomeMsg,
        translation: "Olá! Bem-vindo à nossa aula de hora em hora sobre este tópico. Eu sou a Teacher Gem Coach, sua professora pessoal com voz feminina premium do Gemini. Qual é o seu objetivo na nossa prática de conversação de 15 minutos de hoje?",
        correction: "✨ Bem-vinda à aula nova! Esta aula expira em 15 minutos. Use o microfone para responder!"
      }
    ];
  });

  // Synchronize dynamic hour, class timer, and welcome message on client mount
  useEffect(() => {
    const initTimerId = setTimeout(() => {
      loadSessions(); // Check Supabase setup state and sessions
    }, 50);

    const timerId = setTimeout(() => {
      const runTime = new Date();
      const systemHour = runTime.getHours();
      const systemMinutes = runTime.getMinutes();
      
      setCurrentHour(systemHour);
      
      let computedTimeLeft = 900;
      if (systemMinutes < 15) {
        computedTimeLeft = (15 - systemMinutes) * 60 - runTime.getSeconds();
      }
      setTimeLeft(computedTimeLeft);

      const targetTopic = LESSON_TOPICS.find(l => l.hour === systemHour) || LESSON_TOPICS[10];
      const welcomeMsg = `Hello! Welcome to our hourly lesson on "${targetTopic.topic}". I am Teacher Gem Coach, your personal tutor with a premium female voice from Gemini. What is your goal in our 15-minute speaking practice today?`;
      
      setMessages([
        {
          id: "sys-0",
          role: "tutor",
          text: welcomeMsg,
          translation: "Olá! Bem-vindo à nossa aula de hora em hora sobre este tópico. Eu sou a Teacher Gem Coach, sua professora pessoal com voz feminina premium do Gemini. Qual é o seu objetivo na nossa prática de conversação de 15 minutos de hoje?",
          correction: "✨ Bem-vinda à aula nova! Esta aula expira em 15 minutos. Use o microfone para responder!"
        }
      ]);
    }, 0);

    return () => {
      clearTimeout(timerId);
      clearTimeout(initTimerId);
    };
  }, []);

  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  // Speech recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      return !!SpeechRecognition;
    }
    return false;
  });

  // We use a ref for the SpeechRecognition client to prevent render cycle conflicts/setStates
  const recognitionRef = useRef<any>(null);

  // Audio refs for PCM synthesis playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll dialog
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Class countdown timer effect - decoupled from immediate synchronous rendering
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionActive) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setTimeout(() => setSessionActive(false), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive]);

  // Initialize Web Speech API safely
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setErrorText("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        setInputText(final || interim);
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition Error:", err);
        if (err.error === "not-allowed") {
          setErrorText("Permissão de microfone negada ou indisponível.");
        } else {
          setErrorText(`Erro captação de áudio. Tente digitar seu texto.`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // PCM synthesizer playback for standard browser AudioContext
  const playPCM = (base64Data: string) => {
    try {
      if (currentSrcRef.current) {
        try {
          currentSrcRef.current.stop();
        } catch (e) {}
      }

      if (!base64Data) return;

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const buffer = ctx.createBuffer(1, float32Data.length, 24000);
      buffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      currentSrcRef.current = source;
      source.start(0);
    } catch (error) {
      console.error("Audio synthesise failure:", error);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorText("A captação de áudio através do microfone não pôde ser instanciada no navegador.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        setErrorText("");
        recognition.start();
      } catch (err) {
        console.error("Speech start error:", err);
      }
    }
  };

  // Reset lesson and start new hourly simulation
  const startNewLesson = (hourSlot: number) => {
    setCurrentHour(hourSlot);
    setTimeLeft(900); // 15 mins
    setSessionActive(true);
    setInputText("");
    setErrorText("");
    setSessionId(null); // Reset session ID to fork a new lesson context in database

    const targetTopic = LESSON_TOPICS.find(l => l.hour === hourSlot) || LESSON_TOPICS[10];
    const welcomeMsg = `Hello! Welcome to our hourly lesson on "${targetTopic.topic}". I am Teacher Gem Coach, your personal tutor with a premium female voice from Gemini. What is your goal in our 15-minute speaking practice today?`;
    
    messageCounterRef.current = 1;
    setMessages([
      {
        id: "sys-welcome",
        role: "tutor",
        text: welcomeMsg,
        translation: "Olá! Bem-vindo à nossa aula de hora em hora sobre este tópico. Eu sou a Teacher Gem Coach, sua professora pessoal com voz feminina premium do Gemini. Qual é o seu objetivo na nossa prática de conversação de 15 minutos de hoje?",
        correction: "✨ Bem-vinda à aula nova! Esta aula expira em 15 minutos. Use o microfone para responder!"
      }
    ]);
  };

  // Send message to Gemini server API
  const handleSendMessage = async (e?: React.FormEvent, isVoiceTrigger = false) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || isLoading) return;

    messageCounterRef.current += 1;
    const userMsg: Message = {
      id: `usr-${messageCounterRef.current}`,
      role: "user",
      text: textToSend,
      isSpoken: isVoiceTrigger || isListening
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);
    setErrorText("");

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch(e){}
    }

    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.text
    }));

    const activeTopic = LESSON_TOPICS.find(l => l.hour === currentHour) || LESSON_TOPICS[10];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: conversationHistory,
          topic: activeTopic.topic,
          voiceName: voice,
          level: level,
          sessionId: sessionId,
          isSpoken: userMsg.isSpoken
        })
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com os servidores. Verifique as credenciais.");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Capture generated / returned session ID dynamically
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        loadSessions(); // Refresh historic side tab list
      }

      messageCounterRef.current += 1;
      const tutorResponse: Message = {
        id: `tut-${messageCounterRef.current}`,
        role: "tutor",
        text: data.reply,
        translation: data.translation,
        correction: data.correction,
        audioBase64: data.audioBase64
      };

      setMessages(prev => [...prev, tutorResponse]);

      if (data.audioBase64) {
        playPCM(data.audioBase64);
      }

    } catch (err: any) {
      console.error(err);
      setErrorText(`Falha de conexão com a inteligência artificial do Gemini: ${err.message || "Tente novamente."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLesson = LESSON_TOPICS.find(l => l.hour === currentHour) || LESSON_TOPICS[10];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A192F] font-sans antialiased flex flex-col selection:bg-red-200">
      
      {/* HEADER: Colors of the flag styled cleanly */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Minimalist geometric representation of the US Flag */}
            <div className="w-12 h-7 bg-[#1E3A8A] rounded-xs relative overflow-hidden flex flex-col justify-between border border-[#CBD5E1]" id="us-mini-badge">
              <div className="h-1 bg-[#EF4444]" />
              <div className="h-1 bg-white" />
              <div className="h-1 bg-[#EF4444]" />
              <div className="h-1 bg-[#1E3A8A] absolute left-0 top-0 w-5 h-4 flex items-center justify-center">
                <span className="text-[6px] text-white font-bold leading-none">★</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#0A192F] flex items-center gap-1.5 leading-none">
                Teacher Gem <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold border border-red-200">Coach</span>
              </h1>
              <p className="text-xs text-gray-500 font-mono">Aula de Conversação • Voz Gemini Premium</p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-xs text-slate-600 border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-800" />
              <span>Próxima Aula: {String((currentHour + 1) % 24).padStart(2, "0")}:00</span>
            </div>

            {/* Simulated Hourly Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => startNewLesson(new Date().getHours())}
                className="text-xs font-semibold px-3 py-1.5 rounded-sm bg-white border border-[#1E3A8A] text-[#1E3A8A] hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sincronizar Hora Atual"
              >
                <RotateCcw className="w-3 h-3" />
                Reiniciar Aula
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: THE HOURLY AGENDA (Simulates the 1 hour schedule) or Supabase history */}
        <section className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-sm p-4 flex flex-col h-[calc(100vh-120px)] lg:sticky lg:top-[76px]" id="sidebar-timeline">
          
          {/* Navigation tabs for Switching views */}
          <div className="flex border-b border-slate-100 mb-4 bg-slate-50 p-1 rounded-sm gap-1" id="supabase-tab-selector">
            <button
              onClick={() => setActiveSidebarTab("agenda")}
              className={cn(
                "flex-1 text-center py-2 px-1 rounded-xs text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                activeSidebarTab === "agenda"
                  ? "bg-white text-[#1E3A8A] shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-blue-800" />
              Agenda Temática
            </button>
            <button
              onClick={() => {
                setActiveSidebarTab("history");
                loadSessions();
              }}
              className={cn(
                "flex-1 text-center py-2 px-1 rounded-xs text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                activeSidebarTab === "history"
                  ? "bg-white text-[#1E3A8A] shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              Aulas Salvas
              {dbConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Supabase Conectado" />
              )}
            </button>
          </div>

          {activeSidebarTab === "agenda" ? (
            <>
              <div className="mb-3">
                <p className="text-xs text-gray-500 pl-1">Uma aula nova começa no início de cada hora e dura 15 minutos.</p>
              </div>

              {/* List of lesson slots - showing context around active hour */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="agenda-scroller">
                {LESSON_TOPICS.map((lesson) => {
                  const isActive = lesson.hour === currentHour && !sessionId;
                  const isPast = lesson.hour < currentHour;
                  
                  return (
                    <button
                      key={lesson.hour}
                      onClick={() => startNewLesson(lesson.hour)}
                      className={cn(
                        "w-full text-left p-3 rounded-xs border transition-all flex items-start justify-between relative overflow-hidden group cursor-pointer",
                        isActive 
                          ? "border-[#1E3A8A] bg-[#1E3A8A]/5 shadow-xs" 
                          : isPast
                            ? "border-[#E2E8F0] bg-slate-50 opacity-75 hover:bg-slate-100"
                            : "border-[#E2E8F0] bg-white hover:border-slate-300"
                      )}
                    >
                      {/* Left blue-indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                      )}

                      <div className="pl-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm",
                            isActive 
                              ? "bg-[#1E3A8A] text-white" 
                              : "bg-slate-200 text-slate-700"
                          )}>
                            {String(lesson.hour).padStart(2, "0")}:00
                          </span>
                          <span className="text-slate-800 font-bold text-sm leading-tight">
                            {lesson.topic}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                          {lesson.desc}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        {isActive ? (
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                          </span>
                        ) : isPast ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        )}
                        <span className="text-[10px] text-slate-400 font-mono mt-2">{lesson.level}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Help box */}
              <div className="mt-4 p-3 bg-red-50/50 rounded-xs border border-red-100 text-xs text-slate-600 flex gap-2">
                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Como praticar?</p>
                  <p className="mt-0.5">Selecione qualquer hora para simular o início de uma nova aula temática de 15 minutos e converse em inglês.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* HISTORICAL SESSIONS LIST FROM SUPABASE */}
              <div className="flex-1 flex flex-col min-h-0">
                {!dbConfigured ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-500 bg-slate-50 rounded-sm border border-dashed border-slate-200 flex-1 flex flex-col justify-center items-center">
                    <Database className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                    <p className="font-bold text-slate-700">Supabase não conectado</p>
                    <p className="mt-1 text-slate-500 max-w-[200px]">Adicione um banco de dados Supabase informando o valor do segredo <code className="bg-slate-100 font-mono px-1 rounded border text-[10px] text-red-600">DATABASE_URL</code> nas Configurações.</p>
                  </div>
                ) : pastSessions.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-500 bg-slate-50 rounded-sm border border-dashed border-slate-200 flex-1 flex flex-col justify-center items-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700 text-emerald-900">Supabase conectado!</p>
                    <p className="mt-1 text-slate-500 max-w-[200px]">Nenhum histórico encontrado ainda. Selecione uma aula na Timeline, digite e envie uma mensagem para salvá-la permanentemente.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="supabase-scroller">
                    {pastSessions.map((sess) => {
                      const isSelected = sessionId === sess.id;
                      return (
                        <button
                          key={sess.id}
                          onClick={() => loadSessionMessages(sess.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-xs border transition-all flex items-start justify-between relative overflow-hidden group cursor-pointer",
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/20"
                              : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-xs"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600" />
                          )}
                          <div className="pl-1.5">
                            <h3 className="font-bold text-xs text-slate-800 leading-tight mb-1 group-hover:text-emerald-700 transition-colors">
                              {sess.topic}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                              <span className="bg-slate-100 text-slate-600 px-1 rounded-sm">{sess.level}</span>
                              <span>•</span>
                              <span>
                                {new Date(sess.createdAt).toLocaleDateString("pt-BR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 self-center group-hover:text-emerald-600 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* RIGHT COLUMN: ACTIVE CLASSROOM WORKSPACE */}
        <section className="lg:col-span-8 flex flex-col h-[calc(100vh-120px)] border border-[#E2E8F0] bg-white rounded-sm overflow-hidden" id="main-classroom">
          
          {/* CLASSROOM HEADER BAR */}
          <div className="bg-[#0A192F] text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-4 border-red-600">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-600 text-white font-mono font-bold px-2 py-0.5 rounded-sm tracking-wide flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" /> EM ANDAMENTO
                </span>
                <span className="text-[10px] bg-blue-900 border border-blue-700 font-mono px-2 py-0.5 rounded-sm text-slate-300">
                  {activeLesson.level}
                </span>
              </div>
              <h2 className="text-base font-bold mt-1 tracking-tight text-white flex items-center gap-1.5">
                {activeLesson.topic}
              </h2>
            </div>

            {/* Right side countdown timers */}
            <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                <span className={cn(
                  "font-mono font-bold text-lg text-white",
                  timeLeft < 120 ? "text-red-500 animate-pulse" : ""
                )}>
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase leading-none font-mono">restantes</span>
              </div>
            </div>
          </div>

          {/* SETTINGS AND CONTROLS BAR */}
          <div className="bg-slate-50 border-b border-[#E2E8F0] p-3 flex flex-wrap items-center justify-between gap-3" id="class-settings-bar">
            {/* Level selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nível:</span>
              <div className="inline-flex rounded-sm p-0.5 bg-slate-200">
                {(["Iniciante", "Intermediário", "Avançado"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-sm font-semibold transition-all cursor-pointer",
                      level === l 
                        ? "bg-white text-[#1E3A8A] shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice & Translation selection */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Premium Voice Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-red-600" /> Voz Gemini Premium:
                </span>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as "Kore" | "Zephyr")}
                  className="text-xs font-semibold py-1 px-2 border border-slate-300 rounded-sm bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-[#1E3A8A]"
                >
                  <option value="Kore">Kore (Voz Acolhedora / Suave)</option>
                  <option value="Zephyr">Zephyr (Voz Dinâmica / Brilhante)</option>
                </select>
              </div>

              {/* Translation checkbox toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-500 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTranslations}
                  onChange={() => setShowTranslations(!showTranslations)}
                  className="rounded-sm border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] h-4 w-4"
                />
                Traduzir Respostas
              </label>
            </div>
          </div>

          {/* CHAT GRAPHICS AREA */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4" id="chat-scroller">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-12 h-12 text-[#1E3A8A] opacity-20 mb-3" />
                <h3 className="text-base font-bold text-slate-800">Prepare seu Microfone!</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  Esta aula temática tem duração de 15 minutos. Use o microfone para conversar em inglês com a assistente!
                </p>
                <button
                  onClick={() => startNewLesson(currentHour)}
                  className="mt-4 px-4 py-2 bg-[#1E3A8A] text-white font-semibold text-sm rounded-sm hover:bg-[#1E3A8A]/90 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Entrar na Sala de Aula do Tópico
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isTutor = msg.role === "tutor";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%] md:max-w-[75%]",
                        isTutor ? "self-start mr-auto" : "self-end ml-auto"
                      )}
                    >
                      {/* Name Tag */}
                      <span className={cn(
                        "text-[10px] font-mono tracking-wider text-slate-400 mb-1 flex items-center gap-1",
                        isTutor ? "self-start pl-1" : "self-end pr-1"
                      )}>
                        {isTutor ? "👩🏽‍🏫 TEACHER GEM COACH (GEMINI)" : "👨🏻‍🎓 VOCÊ (ALUNO)"}
                        {!isTutor && msg.isSpoken && (
                          <span className="text-red-600 bg-red-50 px-1.5 py-0.2 rounded-xs border border-red-100 font-bold text-[9px]">🎤 Falado</span>
                        )}
                      </span>

                      {/* Message body bubble */}
                      <div className={cn(
                        "p-4 rounded-sm shadow-2xs relative",
                        isTutor
                          ? "bg-[#0A192F] text-white rounded-tl-none border-l-4 border-red-600"
                          : "bg-white text-[#0A192F] border border-[#E2E8F0] rounded-tr-none"
                      )}>
                        {/* Audio play trigger for tutor */}
                        {isTutor && msg.audioBase64 && (
                          <button
                            onClick={() => playPCM(msg.audioBase64!)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center justify-center"
                            title="Ouvir novamente"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Conversational English text */}
                        <p className="text-sm md:text-base font-bold leading-relaxed pr-6">
                          {msg.text}
                        </p>

                        {/* Portuguese Direct translation */}
                        {showTranslations && msg.translation && (
                          <p className={cn(
                            "text-xs mt-2 border-t pt-2 max-w-lg italic",
                            isTutor ? "text-slate-300 border-white/10" : "text-slate-500 border-slate-100"
                          )}>
                            {msg.translation}
                          </p>
                        )}
                      </div>

                      {/* GRAMMAR EXTRA FEEDBACK BOX */}
                      {isTutor && msg.correction && (
                        <div className="mt-1.5 pl-3 border-l-2 border-red-500 self-start">
                          <div className="bg-white border border-[#E2E8F0] rounded-xs p-3 text-xs shadow-3xs max-w-md">
                            <span className="font-bold text-red-600 flex items-center gap-1.5 font-mono text-[10px] uppercase mb-0.5 animate-pulse">
                              <Sparkles className="w-3.5 h-3.5 text-red-600 fill-red-100" /> CORREÇÕES & GRAMÁTICA (TRADUZIDO)
                            </span>
                            <p className="text-slate-600 text-[11px] md:text-xs leading-normal font-medium">
                              {msg.correction}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col max-w-[70%] self-start mr-auto"
                  >
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 mb-1 pl-1">
                      👩🏽‍🏫 TEACHER GEM COACH IS RESPONDING...
                    </span>
                    <div className="bg-[#0A192F] text-white p-4 rounded-sm rounded-tl-none border-l-4 border-red-600 flex items-center gap-3">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs font-mono text-slate-300">Teacher Gem Coach está falando em áudio premium do Gemini...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INTERACTIVE INPUT BAR WITH MIC SPEECH RECOGNITION */}
          <div className="p-4 bg-white border-t border-[#E2E8F0]" id="input-chat-dock">
            {errorText && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            {timeLeft === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm text-center">
                <h4 className="text-sm font-bold text-slate-800">Tempo de Aula Esgotado!</h4>
                <p className="text-xs text-slate-500 mt-0.5">Esta aula temática de 15 minutos foi concluída. Reinicie para praticar mais ou escolha outro tópico na timeline!</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => startNewLesson((currentHour + 1) % 24)}
                    className="px-4 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-sm hover:bg-[#1E3A8A]/95 transition-all text-center cursor-pointer"
                  >
                    Próxima Aula
                  </button>
                  <button
                    onClick={() => startNewLesson(currentHour)}
                    className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-sm hover:bg-slate-300 transition-all text-center cursor-pointer"
                  >
                    Repetir Tópico Atual
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-3">
                {/* Microphone trigger utilizing Web Speech API */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "p-3.5 rounded-sm transition-all flex items-center justify-center shrink-0 cursor-pointer border relative",
                    isListening
                      ? "bg-red-600 text-white border-red-700 shadow-sm animate-pulse"
                      : "bg-[#F1F5F9] text-[#1E3A8A] border-slate-200 hover:bg-slate-100"
                  )}
                  title={isListening ? "Parar Transcrição" : "Ativar Microfone para Falar"}
                >
                  {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5 text-slate-500" />}

                  {isListening && (
                    <span className="absolute -inset-1 rounded-sm border border-red-400 animate-ping opacity-60" />
                  )}
                </button>

                {/* Main dynamic text input or speech placeholder */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isListening 
                        ? "Ouvindo... Ajuste sua fala em inglês agora!" 
                        : "Escreva em Inglês ou ative o microfone para falar..."
                    }
                    className={cn(
                      "w-full px-4 py-3 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] bg-[#F8FAFC]",
                      isListening ? "placeholder:text-red-600 font-bold text-[#1E3A8A]" : "text-slate-800"
                    )}
                    disabled={isLoading}
                  />

                  {/* Interim status speech indicator */}
                  {isListening && (
                    <div className="absolute right-3 top-3 text-[10px] text-red-600 font-mono font-bold animate-pulse flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> MICROFONE ATIVO
                    </div>
                  )}
                </div>

                {/* Submit text button */}
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/95 text-white p-3 py-3.5 rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 cursor-pointer font-bold uppercase text-xs tracking-wider"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Hint Bar */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-100 pt-2.5">
              <span>🗣️ DICA: Fale frases como &quot;Hi Teacher Gem Coach, let&apos;s start!&quot; ou faça perguntas em Inglês.</span>
              <span>Web Speech API v2.0 • 15 minututos</span>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div>
            <span>Teacher Gem Coach © 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Gemini 3.5 &amp; 3.1 Live Speech</span>
            <span className="text-[#1E3A8A] font-bold">🇺🇸 Proved by AI Studio</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
