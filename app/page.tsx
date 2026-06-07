"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  MessageSquare, 
  Mic, 
  MicOff,
  Send, 
  Volume2, 
  VolumeX,
  History,
  Languages,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  Database,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// Topics representing typical simulated English hourly schedule
const LESSON_TOPICS = [
  { hour: 8, topic: "At the Coffee Shop", desc: "Pratique fazer pedidos de bebidas e lanches, além de interagir educadamente com o atendente.", level: "Iniciante" },
  { hour: 9, topic: "Asking for Directions", desc: "Aprenda a pedir informações sobre pontos turísticos, direções e transportes na cidade.", level: "Iniciante" },
  { hour: 10, topic: "Ordering Food at a Restaurant", desc: "Simule escolher pratos em um menu, fazer perguntas ao garçom e pedir a conta.", level: "Iniciante" },
  { hour: 11, topic: "Checking in at the Airport", desc: "Treine a conversa no balcão de check-in, despacho de bagagem e portões de embarque.", level: "Iniciante" },
  { hour: 12, topic: "Making a Hotel Reservation", desc: "Simule reservar um quarto, tirar dúvidas sobre serviços inclusos e fazer o check-in.", level: "Intermediário" },
  { hour: 13, topic: "Job Interview Practice", desc: "Seja entrevistado para uma vaga internacional, respondendo sobre suas habilidades.", level: "Avançado" },
  { hour: 14, topic: "Describing Your Weekend Plans", desc: "Converse casualmente com um colega sobre o que pretende fazer no fim de semana.", level: "Iniciante" },
  { hour: 15, topic: "Negotiating with a Vendor", desc: "Negocie preços em inglês comercial, expressando ofertas e limites de orçamento.", level: "Avançado" },
  { hour: 16, topic: "Expressing Opinion on Global Topics", desc: "Participe de discussões construtivas sobre meio ambiente ou novas tecnologias.", level: "Avançado" },
  { hour: 17, topic: "A Doctor's Appointment", desc: "Pratique explicar sintomas de saúde detalhadamente e compreender receitas médicas.", level: "Intermediário" },
  { hour: 18, topic: "Making Small Talk at a Party", desc: "Treine quebrar o gelo com estranhos, fazendo perguntas leves em eventos sociais.", level: "Intermediário" },
  { hour: 19, topic: "Giving a Business Presentation", desc: "Pratique apresentar slides, dados trimestrais ou metas de projeto a investidores.", level: "Avançado" },
  { hour: 20, topic: "Answering Tech Support Calls", desc: "Pratique explicar problemas de computador e seguir instruções detalhadas de suporte.", level: "Intermediário" },
  { hour: 21, topic: "Booking a City Tour Guide", desc: "Converse com o guia de turismo para escolher atrações do roteiro local.", level: "Iniciante" },
  { hour: 22, topic: "Discussing Favorite Movies & Books", desc: "Compartilhe sinopses, personagens favoritos e faça recomendações de entretenimento.", level: "Intermediário" },
  { hour: 23, topic: "Talking About Your Dream Career", desc: "Discuta qual seu emprego ideal, aspirações acadêmicas e metas profissionais.", level: "Intermediário" }
];

interface Message {
  id: string;
  sessionId?: string | null;
  role: "user" | "tutor";
  text: string;
  translation?: string;
  correction?: string;
  isSpoken?: boolean;
  createdAt?: string | Date;
}

export default function Home() {
  const [currentHour, setCurrentHour] = useState<number>(10); // Standard starting offset
  const [level, setLevel] = useState<string>("Iniciante");
  const [voice, setVoice] = useState<string>("Kore"); // Kore (Female), Zephyr (Male)
  
  // App states
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  
  // Audio state
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingPlaceholder, setRecordingPlaceholder] = useState<string>("");

  // Supabase states
  const [activeSidebarTab, setActiveSidebarTab] = useState<"agenda" | "history">("agenda");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);

  // Authenticated user accounts state variables
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");

  // Expanded card options
  const [showTranslId, setShowTranslId] = useState<string | null>(null);

  const messageCounterRef = useRef<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordIntervalRef = useRef<any>(null);

  // Check active authenticated session on client mount
  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve active authentication session:", e);
    } finally {
      setAuthChecking(false);
    }
  };

  // Submit standard email + password form credentials
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro ao realizar a autenticação.");
      }

      setUser(data.user);
      // Automatically pull their private histories
      setTimeout(() => {
        loadSessions();
      }, 50);

    } catch (err: any) {
      setAuthError(err.message || "Erro de conexão ao servidor.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Log current user out cleanly
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setSessionId(null);
      setPastSessions([]);
      setSessionActive(false);
      setMessages([]);
      setAuthPassword("");
    } catch (err) {
      console.error("Logout request failed:", err);
    }
  };

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
          setSessionActive(true);
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

  // Synchronize dynamic hour, class timer, and welcome message on client mount
  useEffect(() => {
    const initTimerId = setTimeout(() => {
      checkAuthStatus().then(() => {
        loadSessions(); // Check Supabase setup state and sessions
      });
    }, 50);

    const timerId = setTimeout(() => {
      const runTime = new Date();
      const systemHour = runTime.getHours();
      setCurrentHour(systemHour);
    }, 1000);

    return () => {
      clearTimeout(timerId);
      clearTimeout(initTimerId);
    };
  }, []);

  // Soft auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Client-side Text-to-Speech synthesizer
  const speakTextClient = (text: string) => {
    if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel active speakers to prevent overlapping
    window.speechSynthesis.cancel();

    // Clean brackets or tags for speaking
    const sanitizedText = text.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(sanitizedText);
    utterance.lang = "en-US";

    // Select suitable voice
    const synthVoices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (voice === "Kore") {
      // Look for natural US female
      selectedVoice = synthVoices.find(v => v.lang.includes("en-US") && v.name.toLowerCase().includes("female")) ||
                      synthVoices.find(v => v.lang.includes("en-US") && v.name.toLowerCase().includes("zira")) ||
                      synthVoices.find(v => v.lang.includes("en-US") && (v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("natural")));
    } else {
      // Look for natural US male
      selectedVoice = synthVoices.find(v => v.lang.includes("en-US") && v.name.toLowerCase().includes("male")) ||
                      synthVoices.find(v => v.lang.includes("en-US") && v.name.toLowerCase().includes("david")) ||
                      synthVoices.find(v => v.lang.includes("en") && v.name.toLowerCase().includes("male"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set voice characteristics
    utterance.rate = level === "Iniciante" ? 0.8 : level === "Intermediário" ? 0.95 : 1.1;
    utterance.pitch = voice === "Kore" ? 1.05 : 0.95;

    window.speechSynthesis.speak(utterance);
  };

  const startNewLesson = (hourSlot: number) => {
    if (isRecording) stopRecordingMicrophone();
    window.speechSynthesis.cancel();

    setCurrentHour(hourSlot);
    setSessionActive(true);
    setInputText("");
    setErrorText("");
    setSessionId(null); // Reset session ID to fork a new lesson context in database

    const targetTopic = LESSON_TOPICS.find(l => l.hour === hourSlot) || LESSON_TOPICS[10];
    setLevel(targetTopic.level);
    
    const welcomeMsg = `Hello! Welcome to our hourly lesson on "${targetTopic.topic}". I am Teacher Gem Coach, your personal tutor. What is your goal in our English speaking practice today?`;
    
    const initialTutorMessage: Message = {
      id: "welcome-init",
      role: "tutor",
      text: welcomeMsg,
      translation: `Olá! Boas-vindas à nossa aula desta hora sobre "${targetTopic.topic}". Eu sou o Teacher Gem Coach, seu tutor pessoal. Qual é o seu objetivo na nossa prática de conversação de hoje?`,
      correction: "Ótimo início de lição!",
      isSpoken: false
    };

    setMessages([initialTutorMessage]);
    
    // Play welcoming text instantly
    setTimeout(() => {
      speakTextClient(welcomeMsg);
    }, 300);
  };

  const handleSendMessage = async (e?: React.FormEvent, isVoiceTrigger = false) => {
    if (e) e.preventDefault();

    const actualMessage = inputText.trim();
    if (!actualMessage) return;

    setInputText("");
    setErrorText("");
    setIsLoading(true);

    // Save user's message locally first
    messageCounterRef.current += 1;
    const userMsg: Message = {
      id: `usr-${messageCounterRef.current}`,
      role: "user",
      text: actualMessage,
      isSpoken: isVoiceTrigger
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      // Build previous conversation context history (last 10 interactions)
      const conversationHistory = updatedMessages
        .slice(-10)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const activeTopic = LESSON_TOPICS.find(l => l.hour === currentHour) || LESSON_TOPICS[10];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: actualMessage,
          history: conversationHistory,
          topic: activeTopic.topic,
          voiceName: voice,
          level: level,
          sessionId: sessionId,
          isSpoken: userMsg.isSpoken
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha técnica na resposta da Inteligência Artificial.");
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
        isSpoken: false
      };

      setMessages(prev => [...prev, tutorResponse]);
      speakTextClient(data.reply);

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erro de conexão ao conversar. Por favor teste novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sound generator placeholder for microphone simulation
  const startRecordingMicrophone = () => {
    if (typeof window === "undefined") return;
    setErrorText("");
    setIsRecording(true);
    setRecordingPlaceholder("Ouvindo sua voz...");

    const sentencesFallback = [
      "Hello Teacher, I want to learn English and improve my fluency.",
      "Yes, I would love to order some food from the restaurant menu.",
      "Can you give me directions to the nearest hospital please?",
      "Good afternoon, I am ready to practice conversational speaking with you.",
      "This is a wonderful course! I hope to get a new international job."
    ];

    let ticks = 0;
    recordIntervalRef.current = setInterval(() => {
      ticks += 1;
      setRecordingPlaceholder(`Ouvindo sua voz... (${ticks}s) Fala detectada!`);
      if (ticks >= 4) {
        clearInterval(recordIntervalRef.current);
        const randomSentence = sentencesFallback[Math.floor(Math.random() * sentencesFallback.length)];
        setInputText(randomSentence);
        setIsRecording(false);
        setRecordingPlaceholder("");
        
        // Simulates vocal feedback by triggering submit instantly
        setTimeout(() => {
          setIsLoading(true);
        }, 10);
      }
    }, 1000);
  };

  const stopRecordingMicrophone = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }
    setIsRecording(false);
    setRecordingPlaceholder("");
  };

  // Automated submit if microphone simulation found an output
  useEffect(() => {
    if (inputText && !isRecording && isLoading && messages.length > 0) {
      handleSendMessage(undefined, true);
    }
  }, [inputText, isRecording, isLoading]);

  // Render active auth loading screen
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 font-sans" id="auth-checking">
        <Sparkles className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Verificando sessão de usuário...</p>
      </div>
    );
  }

  // Render on-boarding portal & credentials login-register forms
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 antialiased font-sans items-center justify-center p-4 md:p-8" id="auth-portal">
        <div className="max-w-4xl w-full bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          
          {/* Billboard Column */}
          <div className="p-8 md:p-12 bg-slate-900/40 border-r border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-emerald-600/10 rounded-lg border border-emerald-500/20 shadow-inner flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Gem Coach</h1>
              </div>

              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
                Seu Tutor Pessoal de Inglês Inteligente
              </h2>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Pratique inglês focado em situações reais do cotidiano, receba correções gramaticais instantâneas em português e ouça feedback falado em tempo real.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-500/10 rounded text-blue-400 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Cronograma Temático</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Uma lição sob medida para cada hora do dia, do iniciante ao avançado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 bg-emerald-500/10 rounded text-emerald-400 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Análise de Erros Ativa</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Receba correções didáticas imediatas sobre todos os erros de digitação ou estruturação.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 bg-teal-500/10 rounded text-teal-400 mt-0.5">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Vozes Reais de Síntese</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Escolha os mentores Kore ou Zephyr para guiar sua pronúncia oral.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Sincronização na nuvem com Supabase PostgreSQL.
            </div>
          </div>

          {/* Form Column */}
          <div className="p-8 md:p-12 flex flex-col justify-center bg-slate-950">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                {authMode === "login" ? "Acessar Conta" : "Criar Cadastro"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === "login" 
                  ? "Acesse sua conta para ver seu histórico pessoal e exclusivo de aulas salvas." 
                  : "Cadastre-se gratuitamente para isolar seus cronogramas históricos."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Endereço de E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 flex justify-between items-center">
                  Senha
                  {authMode === "register" && <span className="text-[10px] text-slate-500">Mínimo 6 caracteres</span>}
                </label>
                <input
                  type="password"
                  required
                  placeholder="******"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
                />
              </div>

              {authError && (
                <div className="bg-red-950/20 text-red-300 border border-red-900/30 text-xs p-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-md cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {authSubmitting ? "Autenticando..." : authMode === "login" ? "Entrar na Aula" : "Cadastrar e Começar"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-emerald-400 underline cursor-pointer hover:no-underline transition-colors block mx-auto py-1"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError("");
                }}
              >
                {authMode === "login" ? "Não tem uma conta? Crie o seu cadastro" : "Já tem uma conta? Faça login aqui"}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 antialiased font-sans" id="gem-coach-app">
      
      {/* HEADER BAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 sticky top-0 z-50 shadow-sm" id="header-nav">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/10 rounded-lg border border-emerald-500/20 shadow-inner flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Gem Coach <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">TUTOR IA</span>
              </h1>
              <p className="text-xs text-slate-400">Personal Speaking practice synchronized to Supabase PostgreSQL</p>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Level Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
              {["Iniciante", "Intermediário", "Avançado"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer",
                    level === lvl 
                      ? "bg-slate-800 text-white shadow-sm border border-slate-700" 
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Voice select */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
              <button
                onClick={() => setVoice("Kore")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center gap-1",
                  voice === "Kore"
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Kore <span className="opacity-70 text-[9px]">(Female)</span>
              </button>
              <button
                onClick={() => setVoice("Zephyr")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center gap-1",
                  voice === "Zephyr"
                    ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Zephyr <span className="opacity-70 text-[9px]">(Male)</span>
              </button>
            </div>

            {/* Client-side Audio Toggle */}
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (audioEnabled && typeof window !== "undefined") {
                  window.speechSynthesis.cancel();
                }
              }}
              className={cn(
                "p-2 rounded-md border transition-all cursor-pointer",
                audioEnabled 
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
              title={audioEnabled ? "Áudio Falado: Ligado" : "Áudio Falado: Desligado"}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Conta do Usuário Logado */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-md" id="user-details-header">
                <div className="w-5.3 h-5.3 rounded-full bg-emerald-500 text-slate-950 font-mono font-black flex items-center justify-center text-[10px] shrink-0">
                  {user.email.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] text-slate-300 font-medium hidden sm:inline max-w-[110px] truncate" title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[10px] text-red-400 hover:text-red-300 ml-1.5 cursor-pointer underline shrink-0 font-semibold transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* BODY WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: THE HOURLY AGENDA / HISTORIC SESSIONS */}
        <section className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col h-[calc(100vh-140px)] lg:sticky lg:top-[90px]" id="sidebar-timeline">
          
          {/* Navigation tabs */}
          <div className="flex border-b border-slate-800 mb-4 bg-slate-900/60 p-1 rounded-md gap-1" id="supabase-tab-selector">
            <button
              onClick={() => setActiveSidebarTab("agenda")}
              className={cn(
                "flex-1 text-center py-2 px-1 rounded-sm text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                activeSidebarTab === "agenda"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Timeline de Aulas
            </button>
            <button
              onClick={() => {
                setActiveSidebarTab("history");
                loadSessions();
              }}
              className={cn(
                "flex-1 text-center py-2 px-1 rounded-sm text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5",
                activeSidebarTab === "history"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Aulas Salvas
              {dbConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" title="Supabase Conectado" />
              )}
            </button>
          </div>

          {activeSidebarTab === "agenda" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-3.5">
                <p className="text-xs text-slate-400">Uma lição nova começa no início de cada hora. Selecione uma aula abaixo para iniciar a prática:</p>
              </div>

              {/* Scrollable Timeline */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" id="agenda-scroller">
                {LESSON_TOPICS.map((lesson) => {
                  const isActive = lesson.hour === currentHour && !sessionId;
                  const isCurrentSystemHour = lesson.hour === new Date().getHours();
                  
                  return (
                    <button
                      key={lesson.hour}
                      onClick={() => startNewLesson(lesson.hour)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-md border transition-all flex items-start justify-between relative overflow-hidden group cursor-pointer",
                        isActive 
                          ? "border-emerald-500 bg-emerald-950/20 shadow-md" 
                          : isCurrentSystemHour
                            ? "border-amber-500/50 bg-amber-950/10 hover:bg-amber-950/20"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                      )}
                    >
                      {/* Left visual indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      )}

                      <div className="pl-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                            isActive 
                              ? "bg-emerald-500 text-black" 
                              : "bg-slate-800 text-slate-300"
                          )}>
                            {String(lesson.hour).padStart(2, "0")}:00
                          </span>
                          <span className="text-slate-100 font-bold text-xs md:text-sm leading-tight group-hover:text-amber-300 transition-colors">
                            {lesson.topic}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {lesson.desc}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-1">
                        {isActive ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        ) : isCurrentSystemHour ? (
                          <span className="text-[9px] text-amber-400 font-semibold uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">Agora</span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                        )}
                        <span className="text-[9px] text-slate-500 font-mono mt-2">{lesson.level}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Helper guide */}
              <div className="mt-3 p-3 bg-emerald-950/20 rounded-md border border-emerald-500/15 text-xs text-slate-300 flex gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Qualificar sua fala</p>
                  <p className="mt-0.5 text-slate-400">Comece as conversações à vontade e veja correções inteligentes das suas frases!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* HISTORICAL SESSIONS LIST FROM SUPABASE */}
              <div className="flex-1 flex flex-col min-h-0">
                {!dbConfigured ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-400 bg-slate-900/20 rounded-md border border-dashed border-slate-800 flex-1 flex flex-col justify-center items-center">
                    <Database className="w-8 h-8 text-slate-500 mb-2.5 animate-pulse" />
                    <p className="font-bold text-slate-300">Supabase não conectado</p>
                    <p className="mt-2 text-slate-400 text-center leading-relaxed max-w-[260px]">
                      Adicione um banco de dados real informando o valor de <code className="bg-slate-950 font-mono text-[10px] px-1 py-0.5 rounded text-amber-400">DATABASE_URL</code> em Segredos no menu Settings.
                    </p>
                  </div>
                ) : pastSessions.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-400 bg-slate-900/20 rounded-md border border-dashed border-slate-800 flex-1 flex flex-col justify-center items-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mb-2.5" />
                    <p className="font-bold text-slate-200">Supabase Conectado!</p>
                    <p className="mt-2 text-slate-400 text-center leading-relaxed max-w-[265px]">
                      Nenhuma conversa anterior foi salva ainda. Selecione uma aula temática, e digite mensagens para persisti-las permanentemente no banco de dados.
                    </p>
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
                            "w-full text-left p-3.5 rounded-md border transition-all flex items-start justify-between relative overflow-hidden group cursor-pointer",
                            isSelected
                              ? "border-emerald-500 bg-emerald-950/20"
                              : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                          )}
                          <div className="pl-1">
                            <h3 className="font-bold text-xs text-slate-200 leading-tight mb-1 group-hover:text-emerald-400 transition-colors">
                              {sess.topic}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                              <span className="bg-slate-950 text-slate-300 px-1 rounded-sm">{sess.level}</span>
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
                          <ChevronRight className="w-4 h-4 text-slate-600 self-center group-hover:text-emerald-400 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: ACTIVE CLASSROOM WORKSPACE */}
        <section className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative">
          
          {/* Active Class Header bar */}
          <div className="bg-slate-900 border-b border-slate-800 p-4.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Prática Conectada</span>
                <h3 className="text-sm font-bold text-white">
                  {sessionActive 
                    ? (LESSON_TOPICS.find(l => l.hour === currentHour)?.topic || "English Speaking") 
                    : "Selecione uma aula na Timeline de Aulas para começar"}
                </h3>
              </div>
            </div>

            {sessionActive && (
              <button 
                onClick={() => startNewLesson(currentHour)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 transition-all cursor-pointer"
                title="Reiniciar aula com o tutor"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar Aula
              </button>
            )}
          </div>

          {/* CHAT MESSAGES LOG */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4 bg-slate-950/40 relative">
            
            {/* If no active session welcome card */}
            {!sessionActive ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-8">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <Award className="w-10 h-10 text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight mb-2">Bem-vindo ao Workspace de Conversação Gem Coach!</h4>
                <p className="text-xs text-slate-400 max-w-[420px] leading-relaxed mb-6">
                  Selecione qualquer hora na coluna da esquerda para iniciar uma lição temática de 15 minutos em tempo real, ou selecione o histórico para ver aulas gravadas no Supabase.
                </p>
                <button
                  onClick={() => startNewLesson(10)} // Restores default 10:00 topic
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-md shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-black fill-black" />
                  Iniciar Aula Padrão (10:00h)
                </button>
              </div>
            ) : (
              <>
                {/* Chat content listing */}
                {messages.map((msg) => {
                  const isTutor = msg.role === "tutor";
                  const isTranslated = showTranslId === msg.id;

                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] md:max-w-[70%]",
                        isTutor ? "self-start" : "self-end items-end pb-1"
                      )}
                    >
                      {/* User title/Tutor Title */}
                      <span className="text-[10px] text-slate-500 font-mono mb-1 px-1 flex items-center gap-1">
                        {isTutor ? (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Teacher Gem Coach ({voice})
                          </>
                        ) : (
                          <>
                            Você {msg.isSpoken && <Mic className="w-2.5 h-2.5 text-blue-400 ml-1 inline" />}
                          </>
                        )}
                      </span>

                      {/* Main bubble */}
                      <div 
                        className={cn(
                          "p-3.5 rounded-lg text-sm leading-relaxed relative",
                          isTutor 
                            ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none" 
                            : "bg-emerald-600 font-sans text-black font-semibold rounded-tr-none shadow-sm"
                        )}
                      >
                        <p>{msg.text}</p>

                        {/* Translation on click under model description */}
                        {isTutor && isTranslated && msg.translation && (
                          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 italic bg-slate-950/40 p-2 rounded">
                            <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-wider not-italic uppercase block mb-1">Tradução:</span>
                            {msg.translation}
                          </div>
                        )}
                      </div>

                      {/* Tutor Actions (Grammar feedback and translation buttons) */}
                      {isTutor && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 px-0.5">
                          {/* Speak audio again client side button */}
                          <button
                            onClick={() => speakTextClient(msg.text)}
                            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[10px] px-2 py-1 rounded border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Ouvir pronúncia"
                          >
                            <Volume2 className="w-3 h-3" /> Ouvir
                          </button>

                          {/* Translation Toggle button */}
                          {msg.translation && (
                            <button
                              onClick={() => setShowTranslId(isTranslated ? null : msg.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] px-2 py-1 rounded border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Languages className="w-3 h-3 text-slate-400" /> 
                              {isTranslated ? "Ocultar" : "Traduzir"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Custom feedback/corrections for user sentences (shown for sentences following their input) */}
                      {!isTutor && (
                        <div className="mt-1 flex flex-col items-end">
                          {/* We find previous tutor evaluations of user's skills */}
                          {messages.find((m, idx) => messages[idx - 1]?.id === msg.id && m.role === "tutor")?.correction && (
                            <div className="bg-slate-900/60 text-[11px] text-slate-300 border border-slate-800/80 p-2.5 rounded-md max-w-full italic mt-1">
                              <span className="text-[10px] text-emerald-400 font-bold not-italic block mb-0.5 font-mono">Feedback de Gramática:</span>
                              {messages.find((_, idx) => messages[idx - 1]?.id === msg.id)?.correction}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}

                {/* Loading typing bubble */}
                {isLoading && (
                  <div className="flex flex-col self-start max-w-[70%]">
                    <span className="text-[10px] text-slate-400 font-mono mb-1 px-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                      Gem Coach está pensando...
                    </span>
                    <div className="bg-slate-900 text-slate-400 border border-slate-800 p-4 rounded-lg rounded-tl-none text-xs flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </span>
                      Analisando pronúncia e compondo feedback...
                    </div>
                  </div>
                )}

                {/* Micro-status error warnings */}
                {errorText && (
                  <div className="bg-red-950/20 text-red-300 border border-red-900/30 text-xs p-3.5 rounded-md flex items-start gap-2 max-w-md mx-auto" id="error-banner">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Ocorreu um erro</p>
                      <p className="mt-0.5 text-slate-400">{errorText}</p>
                    </div>
                  </div>
                )}

                {/* Simulated recording banner */}
                {isRecording && (
                  <div className="bg-blue-950/30 text-blue-300 border border-blue-800/30 text-xs p-3 rounded-md flex items-center justify-between max-w-sm mx-auto shadow-md">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>{recordingPlaceholder}</span>
                    </div>
                    <button 
                      onClick={stopRecordingMicrophone}
                      className="text-[10px] uppercase font-bold text-red-400 bg-red-950/40 px-2 py-1 rounded border border-red-500/20 hover:bg-red-950 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Invisible viewport indicator */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* CHAT ACTIONS BOTTOM WRAPPER */}
          {sessionActive && (
            <div className="bg-slate-900 border-t border-slate-800 p-4" id="chat-interactions">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                
                {/* Voice recorder simulation */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecordingMicrophone : startRecordingMicrophone}
                  disabled={isLoading}
                  className={cn(
                    "p-3 rounded-md border transition-all shrink-0 cursor-pointer flex items-center justify-center",
                    isRecording 
                      ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30" 
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30"
                  )}
                  title={isRecording ? "Parar Simulação de Gravação de Voz" : "Simular Gravação de Voz (Falar em inglês)"}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Text prompt element */}
                <input
                  type="text"
                  placeholder="Escreva sua resposta em inglês..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading || isRecording}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-md py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50 disabled:opacity-60"
                  id="chat-text-input"
                />

                {/* Submitting sender button */}
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim() || isRecording}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-md transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-lg"
                  title="Enviar mensagem"
                >
                  <Send className="w-5 h-5 text-black" />
                </button>
              </form>
            </div>
          )}

        </section>

      </main>

    </div>
  );
}
