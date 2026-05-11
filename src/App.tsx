import { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, 
  Trash2, 
  Plus, 
  LogOut, 
  User, 
  MoreVertical,
  Settings,
  Shield,
  Zap,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link,
  Copy,
  ExternalLink,
  Ticket,
  PlusCircle,
  History,
  X,
  Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';
import { 
  auth, 
  db, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signInWithPopup,
  githubProvider,
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  handleFirestoreError,
  OperationType,
  runTransaction,
  increment,
  arrayUnion
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Message, Chat, Model, UserProfile } from './types';
import { ChatFeed } from './components/ChatFeed';
import { ChatInput } from './components/ChatInput';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AppConfig {
  primaryColor: string;
  secondaryColor: string;
  theme: string;
  fontFamily: string;
  glowIntensity: number;
}

import { StarBackground } from './components/StarBackground';

const FLUXION_CORE_INSTRUCTION = ``;

// Helper for image compression to avoid Firestore 1MB limit
const compressImage = async (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => reject(e);
  });
};

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// System Instruction for the Luau Expert
const FLUXION_BASE_INSTRUCTION = `Você é Fluxion, uma IA especializada em desenvolvimento avançado para Roblox Luau.

Seu foco principal é criar código PROFISSIONAL, LIMPO, MODULAR e ESCALÁVEL.

Você NÃO é um gerador de showcases.
Você NÃO cria sistemas aleatórios para “impressionar”.
Você NÃO cria interfaces meramente estéticas; sua prioridade é o PROFISSIONALISMO e a FUNCIONALIDADE.

Seu objetivo é agir como um engenheiro de software experiente.

DIRETRIZES OBRIGATÓRIAS:

1. ARQUITETURA E CÓDIGO:
   - Sempre priorize: arquitetura limpa, legibilidade, modularização, reutilização de componentes e estabilidade.
   - Nunca remova funcionalidades existentes sem necessidade explícita.
   - Nunca simplifique sistemas funcionais apenas para encurtar código.
   - Nunca reescreva arquivos inteiros se apenas pequenas alterações forem necessárias.
   - Preserve estrutura, APIs e compatibilidade do código existente.
   - Analise o contexto e a arquitetura existente antes de gerar novo código.
   - Evite duplicação de lógica e funções gigantes.

2. PADRÕES VISUAIS E COMPONENTES (UX/UI):
   - Priorize SWITCHES em vez de botões de texto simples para estados binários.
   - Interface Profissional: Evite decorações inúteis. Foque em usabilidade.
   - Top Bar: Deve ser global (da esquerda até a direita do painel).
     - Conteúdo da Top Bar: Nome do sistema, Versão no lado esquerdo.
     - Lado Direito da Top Bar: Botão de minimizar e botão de fechar tudo.
   - Painéis: Devem suportar DRAGGING (arrastar).
   - Dropdowns: Devem suportar MULTI-SELEÇÃO quando aplicável.

3. REGRAS DE RESPOSTA E TOKENS:
   - Distribuição de Tokens: Dedique aproximadamente 80% da sua capacidade de tokens para o código (equivalente a ~400 linhas de implementação) e 20% para explicações técnicas (equivalente a ~100 linhas de texto).
   - Implementações Completas: Nunca envie códigos incompletos ou com placeholders como "adicione aqui".
   - Prontidão: Entregue sistemas prontos para execução imediata. O usuário deve ser capaz de copiar e executar sem edições.
   - Respostas Longas: Caso o código seja muito extenso, finalize corretamente a estrutura atual antes de continuar.

4. MENTALIDADE:
   - Você está desenvolvendo ferramentas de nível de produção.
   - Sempre responda em PORTUGUÊS DO BRASIL.

REGRAS FINAIS:
• Preserve a estrutura original do projeto.
• Reutilize funções, variáveis e componentes já existentes.
• Não use comentários substituindo lógica real.
• Mantenha compatibilidade com o código anterior.`;

const WARP_SYSTEM_INSTRUCTION = FLUXION_BASE_INSTRUCTION + `\n\nFOCO ATUAL (WARP): Velocidade máxima e eficiência de execução.`;
const APEX_SYSTEM_INSTRUCTION = FLUXION_BASE_INSTRUCTION + `\n\nFOCO ATUAL (APEX): Raciocínio complexo, algoritmos avançados e estabilidade total.`;
const DEEPSEEK_SYSTEM_INSTRUCTION = `Você é o assistente Fluxion operando via DeepSeek. Respeite as regras de codificação Fluxion: limpo, profissional e modular em Luau.`;
const OPENROUTER_SYSTEM_INSTRUCTION = `Você é o assistente Fluxion operando via OpenRouter. Foco em raciocínio de alto nível e modularidade em Luau.`;
const ARCHITECT_SYSTEM_INSTRUCTION = FLUXION_BASE_INSTRUCTION + `\n\nFOCO ATUAL (ARCHITECT): Design de sistemas, micro-serviços e escalabilidade.`;
const EXPERIMENTAL_SYSTEM_INSTRUCTION = FLUXION_BASE_INSTRUCTION + `\n\nFOCO ATUAL (EXPERIMENTAL): Soluções inovadoras e exploração de novas APIs.`;
const LEARN_INSTRUCTION = `Foco didático e explicativo sobre Luau e Fluxion Framework.`;
const AESTHETIC_INSTRUCTION = `## MODO: ASTHETIC GUI

Quando o modo “Asthetic GUI” estiver ativo:

• Priorize interfaces modernas, organizadas e visualmente profissionais.
• Preserve toda a lógica e arquitetura existente do projeto.
• Nunca reconstrua sistemas internos apenas por estética.
• Foque apenas na camada visual e experiência do usuário.

DIRETRIZES VISUAIS:
• Utilize top bar moderna e inteiriça.
• Utilize sidebar/tab system organizado na esquerda.
• Prefira switches modernos ao invés de TextButtons simples.
• Utilize UICorner em componentes principais.
• Utilize espaçamento consistente entre elementos.
• Utilize UIListLayout e AutomaticCanvasSize para organização responsiva.
• Utilize paleta de cores moderna e chamativa.
• Evite aparência “default Roblox”.
• Evite interfaces quadradas sem estilização.
• Utilize animações suaves com TweenService.
• Utilize efeitos visuais leves e profissionais.
• Priorize compatibilidade mobile.
• Componentes devem possuir áreas de clique confortáveis para touch.

ESTILO VISUAL:
• Estética inspirada em hubs premium modernos.
• Interface limpa, tecnológica e organizada.
• Evite excesso de texto e poluição visual.
• Priorize equilíbrio entre estética e performance.

IMPORTANTE:
• A estética nunca deve quebrar funcionalidades existentes.
• Não remova lógica funcional para simplificar visualmente.
• Preserve compatibilidade com módulos e componentes já existentes.

ASTHETIC GUI MODE — REGRAS VISUAIS OBRIGATÓRIAS

• Priorize aparência profissional e UX moderna
• Utilize switches animados ao invés de toggles simples
• Utilize bordas arredondadas, UIStroke e sombras suaves
• Organize a interface com:
- Top Bar
- Sidebar lateral
- Container principal
- Tabs organizadas

• Evite aparência “Minecraft GUI” ou interfaces quadradas antigas
• Sempre manter consistência visual entre componentes
• Utilize espaçamento uniforme entre elementos
• Sempre usar UIListLayout ou layouts organizados
• Sempre garantir compatibilidade Mobile e PC

REGRAS DE FUNCIONAMENTO
• Nunca remover funcionalidades já existentes
• Nunca substituir sistemas sem necessidade
• Sempre preservar a arquitetura atual
• Sempre enviar o código COMPLETO
• Sempre manter todas as funções previamente existentes
• Nunca deixar blocos incompletos como:
- “logic here”
- “continue aqui”
- “adicione depois”

• Todo sistema criado deve estar funcional

REGRAS DE UX
• Ao minimizar a UI:
- ocultar Container
- ocultar Sidebar
- ocultar páginas/tabs
- evitar elementos transparentes restantes

• Dropdowns devem:
- renderizar corretamente
- atualizar lista automaticamente
- possuir tamanho visível
- possuir zindex correto
- funcionar em mobile

• Tabs devem:
- possuir seleção visual
- nunca sobrepor conteúdo
- esconder páginas inativas corretamente

• ScrollFrames devem:
- usar AutomaticCanvasSize quando necessário
- possuir layout consistente
- evitar clipping incorreto

• Componentes devem possuir:
- padding
- alinhamento
- tamanho consistente
- animações suaves
- feedback visual`;
const BRUTE_INSTRUCTION = `Foco em força bruta, resolvendo problemas complexos sem restrições de estilo, mas mantendo a lógica sólida.`;
const GLOBAL_SYSTEM_INSTRUCTION = FLUXION_BASE_INSTRUCTION;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  
  // Reward System State
  const [redemptionStatus, setRedemptionStatus] = useState<'idle' | 'claiming' | 'success' | 'error' | 'generated'>('idle');
  const [rewardToken, setRewardToken] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminCustomCode, setAdminCustomCode] = useState('');
  const [adminAmount, setAdminAmount] = useState('20');
  const [adminMaxUses, setAdminMaxUses] = useState('1');
  const [adminTokensList, setAdminTokensList] = useState<any[]>([]);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false); // Used for forgot password too
  const [regCooldown, setRegCooldown] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const lastReg = localStorage.getItem('fluxion_last_reg');
      if (lastReg) {
        const diff = Date.now() - parseInt(lastReg);
        const hours24 = 24 * 60 * 60 * 1000;
        if (diff < hours24) {
          const remaining = hours24 - diff;
          const h = Math.floor(remaining / 3600000);
          const m = Math.floor((remaining % 3600000) / 60000);
          setRegCooldown(`Proteção Anti-Abuso: Aguarde ${h}h ${m}m para registrar uma nova conta neste dispositivo.`);
        } else {
          setRegCooldown(null);
        }
      }
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);

  const ADMIN_EMAIL = "wesley04012011w@gmail.com";

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL || user?.email === "darkquoteinsta@gmail.com") {
      setIsAdminMode(true);
    }
  }, [user]);

  // Real-time listener for admin tokens
  useEffect(() => {
    if (!isAdminMode) return;
    const q = query(collection(db, 'reward_tokens'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tokens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminTokensList(tokens);
    });
    return () => unsubscribe();
  }, [isAdminMode]);

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await deleteDoc(doc(db, 'reward_tokens', tokenId));
    } catch (error) {
      console.error("Error deleting token:", error);
    }
  };

  const handleAdminSecret = () => {
    setAdminClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminMode(true);
        alert('MODO ADMIN ATIVADO');
        return 0;
      }
      return next;
    });
  };




   const models: Model[] = [
    { id: 'gemini-3.1-pro-preview', name: 'Fluxion Apex', desc: 'Raciocínio de nova geração', cost: 10, color: '#c084fc' },
    { id: 'gemini-3-flash-preview', name: 'Fluxion Warp', desc: 'Velocidade de dobra', cost: 2, color: '#a855f7' },
    { id: 'gemini-3.1-flash-lite', name: 'Fluxion Pulse', desc: 'Respostas instantâneas', cost: 2, color: '#d946ef' },
    { id: 'openrouter:anthropic/claude-3.5-sonnet', name: 'Fluxion Zenith', desc: 'O ápice da cognição', cost: 1, color: '#f5d0fe' },
    { id: 'openrouter:openai/gpt-4o', name: 'Fluxion Nova', desc: 'Potência e versatilidade', cost: 1, color: '#7c3aed' },
    { id: 'openrouter:deepseek/deepseek-r1', name: 'Fluxion Core', desc: 'Raciocínio profundo', cost: 3, color: '#d8b4fe' },
    { id: 'openrouter:meta-llama/llama-3.3-70b-instruct', name: 'Fluxion Titan', desc: 'Performance massiva', cost: 1, color: '#818cf8' },
    { id: 'openrouter:google/gemini-2.0-pro-exp-02-05:free', name: 'Fluxion Horizon', desc: 'Visão de futuro (2.0 Pro)', cost: 5, color: '#22d3ee' },
    { id: 'deepseek:deepseek-chat', name: 'Fluxion Omega', desc: 'O auge da inteligência', cost: 3, color: '#f472b6' },
    { id: 'deepseek:deepseek-coder', name: 'Fluxion Logic', desc: 'Especialista em código', cost: 3, color: '#9d50bb' },
  ];

  const getModelColor = (modelId: string) => {
    return models.find(m => m.id === modelId)?.color || '#a855f7';
  };

  const modes = [
    { id: 'standard', name: 'Standard', desc: 'Default safe mode', icon: 'zap' },
    { id: 'brute', name: 'Brute', desc: 'No filters, pure code', icon: 'shield-alert' },
    { id: 'experimental', name: 'Experimental', desc: 'Abordagens Únicas', icon: 'flask-conical' },
    { id: 'architect', name: 'Arquiteto', desc: 'Sistemas Modulares', icon: 'cpu' },
    { id: 'learn', name: 'Aprender', desc: 'Mentor didático /human', icon: 'book-open' },
    { id: 'aesthetic', name: 'Aesthetic UI', desc: 'Symmetry & Design', icon: 'layout' },
  ];

  const [chatMode, setChatMode] = useState('standard');
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('fluxion_config');
    if (saved) return JSON.parse(saved);
    return {
      primaryColor: '#3b82f6',
      secondaryColor: '#a855f7',
      theme: 'dark',
      fontFamily: 'sans',
      glowIntensity: 0.8,
    };
  });

  // Theme Syncing
  useEffect(() => {
    localStorage.setItem('fluxion_config', JSON.stringify(appConfig));
    const root = document.documentElement;
    root.style.setProperty('--primary', appConfig.primaryColor);
    root.style.setProperty('--glow-opacity', String(appConfig.glowIntensity));
    
    // Theme logic
    if (appConfig.theme === 'midnight') {
      root.style.setProperty('--primary', '#ffffff');
    } else if (appConfig.theme === 'matrix') {
      root.style.setProperty('--primary', '#00ff41');
    } else {
      root.style.setProperty('--primary', appConfig.primaryColor);
    }
    
    // Borders/Accents use primary
    root.style.setProperty('--bg-main', '#0a0a0c');
    root.style.setProperty('--card-bg', '#121214');

    // Font logic
    if (appConfig.fontFamily === 'mono') {
      root.style.setProperty('--font-main', '"JetBrains Mono", monospace');
    } else if (appConfig.fontFamily === 'serif') {
      root.style.setProperty('--font-main', '"Outfit", sans-serif');
    } else {
      root.style.setProperty('--font-main', '"Inter", sans-serif');
    }
  }, [appConfig]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthChecking(false);
      if (!u) {
        setChats([]);
        setCurrentChatId(null);
        setMessages([]);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  // Credit system logic
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      
      if (!snap.exists()) {
        setDoc(userRef, { 
          credits: 30, 
          lastResetDate: today,
          createdAt: serverTimestamp() 
        }).catch(err => 
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`)
        );
      } else {
        const data = snap.data() as UserProfile;
        // Ensure lastResetDate exists to prevent infinite resets
        const userLastReset = data.lastResetDate;
        
        if (!userLastReset || userLastReset !== today) {
          updateDoc(userRef, { 
            credits: 30, 
            lastResetDate: today 
          }).catch(err => 
            handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`)
          );
        } else {
          setUserProfile(data);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Chats
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Messages for current chat
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    if (!currentChatId) {
      setMessages([{ 
        role: 'assistant', 
        content: 'Olá! Sou seu assistente de Luau. Como posso ajudar com seu código hoje?', 
        userId: user.uid // Match the query UID so it doesn't disappear if query is empty
      }]);
      return;
    }

    const messagesRef = collection(db, 'chats', currentChatId, 'messages');
    const q = query(
      messagesRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      if (messagesList.length > 0) {
        setMessages(messagesList);
      } else {
        // If chat exists but has no messages somehow, keep a welcome message
        setMessages([{ 
          role: 'assistant', 
          content: 'Chat iniciado. Como posso ajudar?', 
          userId: user.uid 
        }]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${currentChatId}/messages`);
    });

    return () => unsubscribe();
  }, [user, currentChatId]);

  // Handle Reward Link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setRewardToken(token);
      setRedemptionStatus('claiming');
      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (rewardToken && user && redemptionStatus === 'claiming') {
      claimReward(rewardToken);
    }
  }, [rewardToken, user, redemptionStatus]);

  const handleGenerateLink = async () => {
    if (!user) return;
    setRedemptionStatus('claiming');
    
    try {
      const tokenId = nanoid(32).toUpperCase();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      const tokenData = {
        userId: user.uid,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        rewardAmount: 10,
        createdAt: serverTimestamp(),
        maxUses: 1,
        usesCount: 0,
        usedBy: []
      };

      await setDoc(doc(db, 'reward_tokens', tokenId), tokenData);

      const claimUrl = `${window.location.origin}/?token=${tokenId}`;
      setGeneratedLink(claimUrl);
      setRedemptionStatus('generated');
    } catch (error: any) {
      console.error('Earn Credits Error:', error);
      setRewardError(error.message);
      setRedemptionStatus('error');
    }
  };

  const handleGenerateAdminToken = async () => {
    try {
      if (!user) return;
      setRedemptionStatus('claiming');
      
      const tokenId = adminCustomCode ? adminCustomCode.toUpperCase() : nanoid(10).toUpperCase();
      const tokenData = {
        rewardAmount: parseInt(adminAmount) || 20,
        maxUses: parseInt(adminMaxUses) || 1,
        usesCount: 0,
        usedBy: [],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)), // 30 days
      };

      await setDoc(doc(db, 'reward_tokens', tokenId), tokenData);
      
      setAdminToken(tokenId);
      setRedemptionStatus('generated');
    } catch (error: any) {
      console.error('Client Admin Generation Error:', error);
      setRewardError(error.message);
      setRedemptionStatus('error');
    }
  };

  const handleClaimManualCode = async () => {
    if (!manualCode.trim()) return;
    setRedemptionStatus('claiming');
    await claimReward(manualCode.trim());
    setManualCode('');
  };

  const copyRewardLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert('Link copiado! Coloque este link como destino no seu encurtador.');
    }
  };

  const claimReward = async (token: string) => {
    if (!user) return;
    try {
      setRedemptionStatus('claiming');
      const tokenRef = doc(db, 'reward_tokens', token.toUpperCase());
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenRef);
        const userDoc = await transaction.get(userRef);
        
        if (!tokenDoc.exists()) throw new Error("Código não encontrado ou inválido.");
        
        const tokenData = tokenDoc.data();
        const maxUses = tokenData.maxUses || 1;
        const usesCount = tokenData.usesCount || 0;
        const usedBy = tokenData.usedBy || [];
        const rewardAmount = tokenData.rewardAmount || 20;

        if (usedBy.includes(user.uid)) throw new Error("Você já resgatou este código.");
        if (usesCount >= maxUses) throw new Error("Este código atingiu o limite máximo de usos.");
        if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) throw new Error("Este código expirou.");

        // update token
        transaction.update(tokenRef, {
          usesCount: increment(1),
          usedBy: arrayUnion(user.uid),
          lastClaimedAt: serverTimestamp()
        });

        // update user
        let currentCredits = 0;
        if (userDoc.exists()) {
          currentCredits = userDoc.data().credits || 0;
        }
        
        transaction.set(userRef, {
          credits: currentCredits + rewardAmount,
          lastResetDate: new Date().toISOString().split('T')[0],
          updatedAt: serverTimestamp()
        }, { merge: true });

        // log
        const logRef = doc(collection(db, 'reward_logs'));
        transaction.set(logRef, {
          userId: user.uid,
          tokenId: token,
          amount: rewardAmount,
          createdAt: serverTimestamp()
        });
      });
      
      setRedemptionStatus('success');
      setTimeout(() => setRedemptionStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Claim Reward Error:', error);
      setRewardError(error.message);
      setRedemptionStatus('error');
    }
  };


  const handlePasswordUpdate = async () => {
    if (!user) return;
    const newPass = prompt("Digite a nova senha:");
    if (!newPass || newPass.length < 6) {
      alert("Senha muito curta!");
      return;
    }
    try {
      await updatePassword(user, newPass);
      alert("Senha atualizada com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao atualizar. Se você fez login há muito tempo, faça logout e entre novamente para redefinir.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        if (!password) {
          setAuthError("Senha é obrigatória.");
          setIsAuthLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'register') {
        if (regCooldown) {
          setAuthError(regCooldown);
          setIsAuthLoading(false);
          return;
        }
        if (!password) {
          setAuthError("Senha é obrigatória.");
          setIsAuthLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem('fluxion_last_reg', Date.now().toString());
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setIsLinkSent(true);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = "Falha na autenticação.";
      if (error.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso.";
      if (error.code === 'auth/weak-password') msg = "A senha deve ter no mínimo 6 caracteres.";
      if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
      if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (regCooldown) {
        setAuthError(regCooldown);
        setIsAuthLoading(false); // Make sure to reset loading
        return;
      }
      await signInWithPopup(auth, githubProvider);
      localStorage.setItem('fluxion_last_reg', Date.now().toString());
    } catch (error: any) {
      console.error("Github Auth Error:", error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError("Popup bloqueado pelo navegador. Por favor, permita popups para este site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("Login cancelado.");
      } else {
        setAuthError("Erro ao conectar no GitHub. Verifique se o provedor está ativo no console Firebase.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Removed window.confirm as it might be blocked in some iframe environments
    
    try {
      // Optimistic UI/Internal state update
      if (currentChatId === id) {
        setCurrentChatId(null);
        setMessages([]);
      }

      // Try to clean up messages first while the chat doc still exists
      // as some rules might depend on the parent document.
      try {
        const messagesRef = collection(db, 'chats', id, 'messages');
        const messagesQuery = query(messagesRef, where('userId', '==', user!.uid));
        const messagesSnap = await getDocs(messagesQuery);
        
        // Delete messages in parallel
        await Promise.all(messagesSnap.docs.map(mDoc => deleteDoc(mDoc.ref)));
      } catch (msgErr) {
        console.warn("Subcollection cleanup error (non-fatal):", msgErr);
      }
      
      // Finally delete the chat document itself
      await deleteDoc(doc(db, 'chats', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
    }
  };

  const handleSendMessage = async (userMessage: string, userImages?: string[]) => {
    if (isLoading) return;
    
    if (!user) return;

    // Block if profile not loaded yet
    if (!userProfile) {
       console.warn("User profile still loading...");
       return;
    }

    const modelCost = models.find(m => m.id === selectedModel)?.cost || 1;

    if (userProfile.credits < modelCost) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Limite de créditos insuficiente.**\n\nO modelo **${models.find(m => m.id === selectedModel)?.name}** consome **${modelCost}** créditos, mas você possui apenas **${userProfile.credits}**.\n\nAguarde o reset diário para continuar usando este modelo ou escolha um mais leve!`,
        userId: user.uid,
        createdAt: Timestamp.now() as any
      }]);
      return;
    }

    setIsLoading(true);

    // Compress images before saving/sending
    const compressedImages: string[] = [];
    if (userImages && userImages.length > 0) {
      for (const img of userImages) {
        try {
          const compressed = await compressImage(img);
          compressedImages.push(compressed);
        } catch (e) {
          console.error("Image compression error", e);
          compressedImages.push(img); // Fallback to original if compression fails
        }
      }
    }
    
    // Optimistic UI update
    const optimisticUserId = user.uid;
    const optimisticUserMessage: Message = {
      role: 'user',
      content: userMessage,
      userId: optimisticUserId,
      images: compressedImages,
      createdAt: Timestamp.now() as any
    };
    setMessages(prev => [...prev, optimisticUserMessage]);

    try {
      let chatId = currentChatId;

      if (!chatId) {
        try {
          const chatDoc = await addDoc(collection(db, 'chats'), {
            title: (userMessage || "Imagem enviada").substring(0, 30) + (userMessage.length > 30 ? '...' : ''),
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          chatId = chatDoc.id;
          setCurrentChatId(chatId);
        } catch (err) {
          console.error('Chat creation failed:', err);
          throw new Error('Falha ao criar nova conversa.');
        }
      } else {
        try {
          await updateDoc(doc(db, 'chats', chatId), {
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Chat update failed:', err);
        }
      }

      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          role: 'user',
          content: userMessage,
          userId: user.uid,
          images: compressedImages,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('User message save failed:', err);
        throw new Error('Falha ao salvar sua mensagem.');
      }

      let aiText = "";
      
      // Logic: If specific model is selected, use dedicated Prompt. Otherwise use chatMode prompts.
      let personalityInstruction = GLOBAL_SYSTEM_INSTRUCTION;
      
      if (selectedModel === 'gemini-3.1-pro-preview') {
        personalityInstruction = APEX_SYSTEM_INSTRUCTION;
      } else if (selectedModel === 'gemini-3-flash-preview') {
        personalityInstruction = WARP_SYSTEM_INSTRUCTION;
      } else if (selectedModel.startsWith('openrouter:')) {
        personalityInstruction = OPENROUTER_SYSTEM_INSTRUCTION;
      } else if (selectedModel.startsWith('deepseek:')) {
        personalityInstruction = DEEPSEEK_SYSTEM_INSTRUCTION;
      } else {
        personalityInstruction = chatMode === 'brute' ? BRUTE_INSTRUCTION : 
                           (chatMode === 'experimental' ? EXPERIMENTAL_SYSTEM_INSTRUCTION :
                           (chatMode === 'architect' ? ARCHITECT_SYSTEM_INSTRUCTION :
                           (chatMode === 'learn' ? LEARN_INSTRUCTION : 
                           (chatMode === 'aesthetic' ? AESTHETIC_INSTRUCTION : GLOBAL_SYSTEM_INSTRUCTION))));
      }

      const systemInstruction = personalityInstruction;
      
      if (selectedModel.startsWith('gemini')) {
        try {
          const result = await ai.models.generateContent({
             model: selectedModel,
             contents: [
               ...messages.map(m => ({ 
                 role: m.role === 'assistant' ? 'model' : 'user', 
                 parts: [{ text: m.content || "" }] 
               })),
               { role: 'user', parts: [{ text: userMessage }] }
             ],
             config: {
               systemInstruction,
               temperature: chatMode === 'brute' ? 0.8 : 0.5,
             }
          });
          aiText = result.text || "Sem resposta da IA.";
        } catch (gemError: any) {
           console.error("Gemini SDK Error:", gemError);
           let errorMsg = gemError.message || "Erro desconhecido no Gemini SDK";
           
           if (errorMsg.includes("503") || errorMsg.includes("demand")) {
             errorMsg = "O modelo está sobrecarregado no momento. Tente novamente em alguns segundos.";
           } else if (errorMsg.includes("key") || errorMsg.includes("400")) {
             errorMsg = "Erro na chave de API ou parâmetros inválidos.";
           }
           
           setMessages(prev => [...prev, {
             role: 'assistant',
             content: `⚠️ **Erro no Gemini:** ${errorMsg}`,
             userId: user.uid,
             createdAt: Timestamp.now() as any
           }]);
           throw new Error(errorMsg);
        }
      } else {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage }
            ],
            systemInstruction,
            temperature: chatMode === 'brute' ? 0.8 : 0.5,
            max_tokens: 8192,
          }),
        });

        const responseClone = response.clone();
        if (!response.ok) {
          let errorMessage = "Erro ao processar solicitação de IA";
          const contentType = response.headers.get("content-type");
          
          try {
            if (contentType && contentType.includes("application/json")) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
              if (errorData.details) errorMessage += `: ${errorData.details}`;
            } else {
              const errorText = await response.text();
              console.error("Non-JSON error response from server:", errorText);
              if (errorText.includes("<!DOCTYPE html>") || errorText.includes("<html>")) {
                errorMessage = `Erro interno do servidor (${response.status})`;
              } else {
                errorMessage = errorText.substring(0, 200) || `Erro do servidor (${response.status})`;
              }
            }
          } catch (parseError) {
            console.error("Error parsing failed response:", parseError);
            errorMessage = `Erro de comunicação (${response.status})`;
          }
          
          console.error("Chat Error:", errorMessage);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ **Erro:** ${errorMessage}`,
            userId: user.uid,
            createdAt: Timestamp.now() as any
          }]);
          throw new Error(errorMessage);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          try {
            const text = await responseClone.text();
            console.error("Failed to parse JSON success response. Raw text:", text);
          } catch (e) {}
          throw new Error("O servidor retornou uma resposta inválida (não-JSON).");
        }
        
        aiText = data.text || "Sem resposta do servidor.";
      }

      // Decrement credits atomically
      try {
        const userRef = doc(db, 'users', user.uid);
        const currentModelCost = models.find(m => m.id === selectedModel)?.cost || 1;
        await updateDoc(userRef, {
          credits: increment(-currentModelCost)
        });
      } catch (err) {
        console.error('Credit decrement failed:', err);
      }

      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          role: 'assistant',
          content: aiText,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('AI message save failed:', err);
        throw new Error('Falha ao salvar resposta da IA.');
      }

    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-full bg-[#020203] flex flex-col items-center justify-center p-6 text-center">
        <StarBackground />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="relative z-10"
        >
          <div className="absolute inset-0 bg-purple-500 blur-[60px] opacity-20" />
          <div className="mb-6 mx-auto flex items-center justify-center">
            <Logo size={80} />
          </div>
          <p className="text-[12px] font-mono tracking-[0.5em] text-zinc-500 uppercase">INICIALIZANDO FLUXION...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen bg-[#020203] luau-grid overflow-hidden font-sans relative selection:bg-blue-500/30 selection:text-blue-200",
      appConfig.fontFamily === 'mono' ? 'font-mono' : appConfig.fontFamily === 'serif' ? 'font-serif' : 'font-sans'
    )} style={{ 
      color: 'white',
      '--tw-ring-color': appConfig.primaryColor,
    } as any}>
      <div className="scanline" />
      <StarBackground />
      {/* Background is clean without central glow */}

      {/* Redemption Overlay */}
      <AnimatePresence>
        {redemptionStatus !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
            >
              {redemptionStatus === 'claiming' && (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20" />
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto relative z-10" />
                  </div>
                  <h3 className="text-xl font-black">VALIDANDO LINK</h3>
                  <p className="text-zinc-500 text-sm">Sincronizando com a rede neural...</p>
                </div>
              )}

              {redemptionStatus === 'success' && (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 blur-[40px] opacity-20" />
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto relative z-10" />
                  </div>
                  <h3 className="text-xl font-black">CRÉDITOS RESGATADOS!</h3>
                  <p className="text-zinc-500 text-sm">+10 Créditos adicionados ao seu perfil.</p>
                  <button 
                    onClick={() => setRedemptionStatus('idle')}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl mt-4"
                  >
                    CONTINUAR
                  </button>
                </div>
              )}

              {redemptionStatus === 'generated' && (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20" />
                    <Link className="w-16 h-16 text-blue-500 mx-auto relative z-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black italic tracking-tight">LINK DO DESTINO PRONTO</h3>
                    <p className="text-zinc-500 text-sm">Use este link como "Target URL" ou "Destination" no seu encurtador.</p>
                  </div>
                  
                  <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] font-mono text-zinc-500 truncate flex-1">{generatedLink}</span>
                    <button 
                      onClick={copyRewardLink}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-blue-400"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setRedemptionStatus('idle')}
                      className="py-3 bg-zinc-800 text-white font-bold rounded-xl text-sm"
                    >
                      FECHAR
                    </button>
                    <button 
                      onClick={() => window.open(generatedLink!, '_blank')}
                      className="py-3 bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                    >
                      TESTAR <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              )}
              {redemptionStatus === 'error' && (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-20" />
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto relative z-10" />
                  </div>
                  <h3 className="text-xl font-black">FALHA NO RESGATE</h3>
                  <p className="text-red-400 text-sm font-mono">{rewardError || 'Token inválido ou expirado.'}</p>
                  <button 
                    onClick={() => setRedemptionStatus('idle')}
                    className="w-full py-3 bg-zinc-800 text-white font-bold rounded-xl mt-4"
                  >
                    FECHAR
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 w-64 flex flex-col sidebar-glass z-40 transition-transform duration-300 md:translate-x-0 overflow-hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 flex flex-col gap-5 flex-1 overflow-hidden">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex items-center justify-center">
              <Logo size={36} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white/90">FLUXION</h1>
              <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase opacity-50">v1.0.0</p>
            </div>
          </div>

          <button 
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/95 text-black text-xs font-bold hover:bg-white transition-all shadow-sm"
          >
            <Plus size={16} />
            NOVO CHAT
          </button>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden mt-1">
            <div>
              <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-[0.2em] pl-2 mb-2">Histórico</p>
              <div className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-340px)] pr-2 scrollbar-hide">
                {chats.length === 0 ? (
                  <div className="px-3 py-6 text-center border border-dashed border-white/5 rounded-lg">
                    <p className="text-[10px] text-zinc-700 font-mono italic">Sem registros</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={chat.id}
                      onClick={() => {
                        setCurrentChatId(chat.id);
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 border",
                        currentChatId === chat.id 
                          ? "bg-purple-600/5 border-purple-500/10 text-purple-400" 
                          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={cn(
                          "w-1 h-1 rounded-full shrink-0",
                          currentChatId === chat.id ? "bg-purple-500 shadow-[0_0_5px_rgba(147,51,234,0.4)]" : "bg-zinc-800"
                        )} />
                        <span className="text-xs truncate font-medium">{chat.title}</span>
                      </div>
                      <button 
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all text-zinc-700 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-white/5 space-y-0.5">
              <button 
                disabled
                className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-yellow-400/10 text-yellow-500 border border-yellow-400/20 transition-all w-full text-xs group animate-pulse cursor-not-allowed mb-2"
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={16} />
                  <span className="font-bold">Acesso VIP</span>
                </div>
                <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black">EM BREVE</span>
              </button>
              
              <button 
                onClick={() => setIsRewardModalOpen(true)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-blue-500/80 hover:text-blue-400 hover:bg-blue-500/5 transition-all w-full text-xs group"
              >
                <Coins size={16} />
                <span className="font-bold">Obter Créditos</span>
              </button>
              {isAdminMode && (
                <button 
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all w-full text-xs font-bold"
                >
                  <Shield size={16} />
                  Painel Admin
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/5">
          {user && userProfile && (
            <div className="mb-4 space-y-2 px-1">
              <div className="flex items-center justify-between">
                <span 
                  onClick={handleAdminSecret}
                  className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest cursor-pointer hover:text-zinc-500"
                >
                  Créditos
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  {userProfile.credits}/30
                </span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(userProfile.credits / 30) * 100}%` }}
                  className="h-full rainbow-progress opacity-80" 
                />
              </div>
            </div>
          )}
          
          {user ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-lg border border-white/10 overflow-hidden bg-zinc-900 shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="pfp" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-600/15">
                    <User size={14} className="text-purple-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 truncate leading-tight">{user.displayName || user.email?.split('@')[0]}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter">Usuário</span>
                  <button 
                    onClick={handlePasswordUpdate}
                    className="text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase font-black"
                  >
                    Senha
                  </button>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-1.5 text-zinc-700 hover:text-red-500 transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="w-full py-3 text-center text-zinc-600 text-[9px] font-bold uppercase tracking-widest bg-white/5 rounded-xl border border-white/5">
              Lockout Mode
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <main className="flex-1 flex flex-col items-center relative overflow-hidden bg-transparent transition-colors duration-700 neon-border-inner" style={{ boxShadow: `inset 0 -100px 200px -100px rgba(168, 85, 247, 0.2)` }}>
        {/* Dynamic Background Glow */}
        <div 
          className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] opacity-5 transition-colors duration-700 -z-10"
          style={{ backgroundColor: getModelColor(selectedModel) }}
        />
        {/* Header */}
        <header className="w-full flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-zinc-800/50 border border-purple-500/20 text-purple-400"
            >
              <MoreVertical size={18} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Sincronicidade Estável</span>
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-white">
                {currentChatId ? chats.find(c => c.id === currentChatId)?.title || 'Chat Ativo' : 'Novo Chat'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Modelo Ativo</span>
              <span className="text-[11px] font-mono font-medium" style={{ color: getModelColor(selectedModel) }}>
                {models.find(m => m.id === selectedModel)?.name.toUpperCase()}
              </span>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {chatMode}
            </div>
          </div>
        </header>

        {/* Chat Feed */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto">
             <div className="w-full space-y-8">
                <div className="text-center">
                   <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mb-6 inline-block"
                  >
                    <div className="absolute inset-0 bg-purple-500 blur-[40px] opacity-20 rounded-full" />
                    <div className="relative">
                      <Logo size={64} />
                    </div>
                  </motion.div>
                  <h1 className="text-3xl font-black tracking-tight text-white mb-2 italic">FLUXION</h1>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold opacity-60">Acesse a rede neural especializada</p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                  
                  {!isLinkSent ? (
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      {(authError || (authMode === 'register' && regCooldown)) && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">
                          {authError || regCooldown}
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-MAIL</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="neural@fluxion.ink"
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-800 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                          required
                        />
                      </div>

                      {authMode !== 'forgot' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">SENHA</label>
                          <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-800 focus:outline-none focus:border-blue-500/50 transition-all"
                            required
                          />
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={isAuthLoading || (authMode === 'register' && !!regCooldown)}
                        className="w-full py-4 bg-white text-black font-black rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-xs tracking-widest"
                      >
                        {isAuthLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (
                          authMode === 'login' ? 'AUTENTICAR' : 
                          authMode === 'register' ? 'REGISTRAR' : 'RECUPERAR ACESSO'
                        )}
                      </button>

                      {authMode === 'login' && (
                        <button 
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="w-full text-center text-[10px] text-zinc-600 font-bold uppercase tracking-wider hover:text-zinc-400 transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}

                      <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-tighter">
                          <span className="bg-zinc-900 px-4 text-zinc-500">Ou via rede externa</span>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleGithubAuth}
                        disabled={isAuthLoading || !!regCooldown}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-widest border border-white/5"
                      >
                        <Github size={16} />
                        Conectar com GitHub
                      </button>
                    </form>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20 w-fit mx-auto">
                        <CheckCircle2 className="text-blue-500" size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-white font-bold text-lg uppercase tracking-tight italic flex items-center justify-center gap-2">
                          LINK ENVIADO
                        </h3>
                        <p className="text-zinc-500 text-xs leading-relaxed max-w-[240px] mx-auto">
                          Enviamos as instruções para <span className="text-blue-400 font-bold">{email}</span>. <br/>
                          <span className="text-[10px] text-amber-500/80 mt-2 block">⚠️ VERIFIQUE TAMBÉM SUA PASTA DE SPAM</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsLinkSent(false);
                          setAuthMode('login');
                        }}
                        className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
                      >
                        VOLTAR PARA LOGIN
                      </button>
                    </div>
                  )}

                  {!isLinkSent && (
                    <>
                      <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {authMode === 'login' ? 'Novo na rede?' : 'Já possui registro?'}
                          <button 
                            type="button"
                            onClick={() => {
                              setAuthMode(authMode === 'login' ? 'register' : 'login');
                              setAuthError(null);
                            }}
                            className="ml-2 text-blue-400 hover:text-blue-300 font-black"
                          >
                            {authMode === 'login' ? 'CRIAR CONTA' : 'FAZER LOGIN'}
                          </button>
                        </p>
                      </div>
                    </>
                  )}
                </div>
             </div>
          </div>
        ) : (
          <ChatFeed messages={messages} isLoading={isLoading} />
        )}

        <EarnCreditsModal 
          isOpen={isRewardModalOpen} 
          onClose={() => setIsRewardModalOpen(false)}
          redemptionStatus={redemptionStatus}
          rewardError={rewardError}
          manualCode={manualCode}
          setManualCode={setManualCode}
          onClaim={handleClaimManualCode}
        />

        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          tokens={adminTokensList}
          onDeleteToken={handleDeleteToken}
          onGenerateAdminToken={handleGenerateAdminToken}
          adminToken={adminToken}
          adminInputs={{
            code: adminCustomCode,
            setCode: setAdminCustomCode,
            amount: adminAmount,
            setAmount: setAdminAmount,
            maxUses: adminMaxUses,
            setMaxUses: setAdminMaxUses
          }}
          redemptionStatus={redemptionStatus}
        />

        {/* Floating Input Area */}
        <ChatInput 
          isLoading={isLoading}
          onSend={handleSendMessage}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          chatMode={chatMode}
          setChatMode={setChatMode}
          models={models}
          modes={modes}
          credits={userProfile?.credits ?? null}
        />
      </main>
    </div>
  );
}

// --- Earn Credits Modal Component ---
interface EarnCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemptionStatus: 'idle' | 'claiming' | 'success' | 'error' | 'generated';
  rewardError: string | null;
  manualCode: string;
  setManualCode: (code: string) => void;
  onClaim: () => void;
}

function EarnCreditsModal({ 
  isOpen, 
  onClose, 
  redemptionStatus, 
  rewardError, 
  manualCode, 
  setManualCode, 
  onClaim
}: EarnCreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Coins className="text-blue-500" size={20} />
              RECOMPENSAS
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Obtenha créditos adicionais</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-6">
            {/* Manual Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Inserir Código Manual</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="EX: FLUX-XXXX-XXXX"
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
                <button 
                  onClick={onClaim}
                  disabled={redemptionStatus === 'claiming' || !manualCode.trim()}
                  className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                >
                  {redemptionStatus === 'claiming' ? <Loader2 className="animate-spin" size={18} /> : 'OK'}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {redemptionStatus === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400"
                >
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-wide">Créditos Adicionados!</span>
                </motion.div>
              )}
              {redemptionStatus === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400"
                >
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold">{rewardError || 'Erro no resgate'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Admin Panel Component ---
interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: any[];
  onDeleteToken: (id: string) => void;
  onGenerateAdminToken: () => void;
  adminToken: string | null;
  adminInputs: {
    code: string;
    setCode: (v: string) => void;
    amount: string;
    setAmount: (v: string) => void;
    maxUses: string;
    setMaxUses: (v: string) => void;
  };
  redemptionStatus: string;
}

function AdminPanel({
  isOpen,
  onClose,
  tokens,
  onDeleteToken,
  onGenerateAdminToken,
  adminToken,
  adminInputs,
  redemptionStatus
}: AdminPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Sidebar / Form */}
        <div className="w-full md:w-80 p-6 border-b md:border-b-0 md:border-r border-white/5 space-y-6 bg-black/20 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              ADMIN
            </h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Código Customizado</label>
              <input 
                type="text"
                value={adminInputs.code}
                onChange={(e) => adminInputs.setCode(e.target.value.toUpperCase())}
                placeholder="EX: NATAL2024"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Créditos</label>
                <input 
                  type="number"
                  value={adminInputs.amount}
                  onChange={(e) => adminInputs.setAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Máx Usos</label>
                <input 
                  type="number"
                  value={adminInputs.maxUses}
                  onChange={(e) => adminInputs.setMaxUses(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <button 
              onClick={onGenerateAdminToken}
              disabled={redemptionStatus === 'claiming'}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-[0.98] disabled:opacity-50"
            >
              CRIAR NOVO TOKEN
            </button>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] text-zinc-500 leading-relaxed italic">
            Tokens criados aqui podem ser usados por qualquer usuário até atingirem o limite de usos.
          </div>
        </div>

        {/* Content / List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Tokens Ativos</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Gerencie os códigos do sistema</p>
            </div>
            <button onClick={onClose} className="hidden md:block p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="space-y-3">
              {tokens.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/5 rounded-2xl">
                  <p className="text-sm text-zinc-600 font-mono italic">Nenhum token encontrado no Firebase</p>
                </div>
              ) : (
                tokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl transition-all hover:border-white/10 group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-black text-white tracking-wider">{token.id}</span>
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight",
                          token.usesCount >= token.maxUses ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
                        )}>
                          {token.usesCount >= token.maxUses ? 'ESGOTADO' : 'ATIVO'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono">
                        <span>💰 {token.rewardAmount} CRÉDITOS</span>
                        <span>👥 {token.usesCount} / {token.maxUses} USOS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(token.id);
                          alert('Copiado!');
                        }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteToken(token.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

