import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";
import OpenAI from "openai";
import admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const projectId = firebaseConfig.projectId;
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}
const firebaseApp = admin.apps[0]!;

// Use the standard getFirestore which is more compatible with firebase-admin apps
// Fallback logic for environments with limited IAM
const fdb = getFirestore(firebaseApp, databaseId);

// Verify Firestore connection at startup
(async () => {
  try {
    console.log(`Verifying Firestore: ${projectId}/${databaseId}...`);
    await fdb.collection("_health").limit(1).get();
    console.log("Firestore connection verified.");
  } catch (err: any) {
    console.error("Firestore initialization warning:", err.message);
  }

  // Check for critical environment variables
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1);
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_1);
  const hasDeepseek = !!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_1);
  
  console.log("AI Providers Status:");
  console.log(`- Gemini: ${hasGemini ? "CONFIGURED" : "MISSING"}`);
  console.log(`- OpenRouter: ${hasOpenRouter ? "CONFIGURED" : "MISSING"}`);
  console.log(`- DeepSeek: ${hasDeepseek ? "CONFIGURED" : "MISSING"}`);
  
  if (!hasGemini) {
    console.warn("CRITICAL: GEMINI_API_KEY is missing. Gemini models will not work outside the preview environment until configured in Settings.");
  }
})();

// --- Helper for creating a reward token (legacy/fallback) ---
async function createToken(code: string | null, amount: number = 20, maxUses: number = 1) {
  const tokenId = code ? code.toUpperCase() : nanoid(10).toUpperCase();
  const tokenData = {
    rewardAmount: amount,
    maxUses: maxUses,
    usesCount: 0,
    usedBy: [],
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)), 
  };
  await fdb.collection("reward_tokens").doc(tokenId).set(tokenData);
  return tokenId;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Middleware to verify Firebase ID Token
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token!);
      req.user = decodedToken;
      next();
    } catch (error: any) {
      console.error("Auth ERROR:", error.message);
      res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", project: projectId, database: databaseId });
  });

  // Unified AI Proxy
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { model, messages, temperature, max_tokens, systemInstruction } = req.body;

      if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Missing required parameters (model or messages)." });
      }

      // 1. Google Gemini
      if (model.includes("gemini")) {
        // Internal mapping for custom Fluxion IDs to standard Google models
        const modelMap: { [key: string]: string } = {
          'gemini-3.1-pro-preview': 'gemini-1.5-pro',
          'gemini-3-flash-preview': 'gemini-1.5-flash',
          'gemini-3.1-flash-lite': 'gemini-1.5-flash-lite',
          'gemini-pro': 'gemini-1.5-pro',
          'gemini-flash': 'gemini-1.5-flash'
        };
        const actualModel = modelMap[model] || model;

        const geminiKeys = [
          process.env.GEMINI_API_KEY_1,
          process.env.GEMINI_API_KEY_2,
          process.env.GEMINI_API_KEY_3,
          process.env.GEMINI_API_KEY_4,
          process.env.GEMINI_API_KEY_5,
          process.env.GEMINI_API_KEY,
        ].filter(k => k && k.length > 5);

        if (geminiKeys.length === 0) {
          return res.status(500).json({ 
            error: "GEMINI_API_KEY não configurada.",
            details: "Certifique-se de preencher as chaves GEMINI_API_KEY_1 até 5 nas configurações do projeto." 
          });
        }

        let lastGeminiError: any = null;
        const shuffledGeminiKeys = [...geminiKeys].sort(() => Math.random() - 0.5);

        for (const geminiKey of shuffledGeminiKeys) {
          try {
            const serverGenAI = new GoogleGenerativeAI(geminiKey);
            const genModel = serverGenAI.getGenerativeModel({ 
              model: actualModel,
              systemInstruction: systemInstruction 
            });

            const chatHistory = messages.slice(0, -1).map((m: any) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.content || "" }],
            }));

            const lastMessage = messages[messages.length - 1];
            const result = await genModel.generateContent({
              contents: [...chatHistory, { role: "user", parts: [{ text: lastMessage.content || "" }] }],
              generationConfig: {
                temperature: temperature ?? 0.7,
                maxOutputTokens: max_tokens ?? 4096,
              },
            });

            const aiResponse = await result.response;
            return res.json({ text: aiResponse.text() });
          } catch (err: any) {
            lastGeminiError = err;
            const errMsg = err.message || "";
            console.error(`[Gemini Error] ${model}: ${errMsg}`);
            
            if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("500") || errMsg.includes("400")) {
              continue;
            }
            break;
          }
        }

        return res.status(lastGeminiError?.status || 500).json({
          error: "Erro no Gemini",
          details: lastGeminiError?.message || "Falha ao processar resposta da IA"
        });
      }

      // 2. Native DeepSeek
      if (model.startsWith("deepseek:") || (model.includes("deepseek") && !model.includes("/"))) {
        const keys = [
          process.env.DEEPSEEK_API_KEY_1,
          process.env.DEEPSEEK_API_KEY_2,
          process.env.DEEPSEEK_API_KEY_3,
          process.env.DEEPSEEK_API_KEY_4,
          process.env.DEEPSEEK_API_KEY_5,
          process.env.DEEPSEEK_API_KEY,
        ].filter(k => k && k.length > 5);

        if (keys.length === 0) {
          return res.status(500).json({ 
            error: "DEEPSEEK_API_KEY não configurada.",
            details: "Certifique-se de preencher as chaves DEEPSEEK_API_KEY_1 até 5 nas configurações."
          });
        }

        const actualModel = model.replace("deepseek:", "");
        const deepseekModel = actualModel === "deepseek-chat" || actualModel === "deepseek-coder" ? actualModel : "deepseek-chat";

        // Try rotating through keys if one fails with 402 (Insufficient Balance)
        let lastError: any = null;
        // Shuffle keys to start from a random point for load balancing
        const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);

        for (const apiKey of shuffledKeys) {
          try {
            const deepseek = new OpenAI({
              apiKey: apiKey,
              baseURL: "https://api.deepseek.com",
            });

            const response = await deepseek.chat.completions.create({
              model: deepseekModel,
              messages: [
                ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
                ...messages
              ],
              temperature: temperature ?? 0.7,
              max_tokens: max_tokens ?? 4096,
            });

            return res.json({ text: response.choices[0].message.content });
          } catch (err: any) {
            lastError = err;
            console.error(`[DeepSeek Key Error] Rotating key due to: ${err.message}`);
            // If it's a balance or auth error, continue to next key. 
            // If it's a different error (like context length), we might want to stop, but for now let's try other keys.
            if (err.status === 402 || err.status === 401) continue;
            break; // Stop for non-recoverable errors
          }
        }

        // If we reach here, all keys failed
        let details = lastError?.message || "Erro desconhecido";
        if (lastError?.status === 402) {
          details = "Saldo insuficiente em todas as chaves DeepSeek configuradas (402). Por favor, recarregue seus créditos no console da DeepSeek.";
        } else if (lastError?.status === 401) {
          details = "Chaves DeepSeek inválidas (401). Verifique as chaves configuradas.";
        }

        return res.status(lastError?.status || 500).json({
          error: "Erro na API DeepSeek (Todas as chaves falharam)",
          details: details,
          code: lastError?.status
        });
      }

      // 3. Groq
      if (model.startsWith("groq:")) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY não configurada." });

        const groq = new OpenAI({
          apiKey: apiKey,
          baseURL: "https://api.groq.com/openai/v1",
        });

        const response = await groq.chat.completions.create({
          model: model.replace("groq:", ""),
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            ...messages
          ],
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens ?? 4096,
        });

        return res.json({ text: response.choices[0].message.content });
      }

      // 4. OpenAI
      if (model.startsWith("openai:") || model.startsWith("gpt-")) {
        const apiKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY; // Handle both variants
        if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: model.replace("openai:", ""),
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            ...messages
          ],
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens ?? 4096,
        });

        return res.json({ text: response.choices[0].message.content });
      }

      // 5. OpenRouter
      if (model.startsWith("openrouter:")) {
        const orKeys = [
          process.env.OPENROUTER_API_KEY_1,
          process.env.OPENROUTER_API_KEY_2,
          process.env.OPENROUTER_API_KEY_3,
          process.env.OPENROUTER_API_KEY_4,
          process.env.OPENROUTER_API_KEY_5,
          process.env.OPENROUTER_API_KEY,
        ].filter(k => k && k.length > 10);

        if (orKeys.length === 0) {
          return res.status(500).json({ 
            error: "OPENROUTER_API_KEY não configurada.",
            details: "Configure as chaves OPENROUTER_API_KEY_1 até 5 nas configurações do projeto."
          });
        }

        const actualModel = model.replace("openrouter:", "");
        let lastOrError: any = null;
        const shuffledOrKeys = [...orKeys].sort(() => Math.random() - 0.5);

        for (const orKey of shuffledOrKeys) {
          try {
            const openrouter = new OpenAI({
              apiKey: orKey,
              baseURL: "https://openrouter.ai/api/v1",
              defaultHeaders: {
                "HTTP-Referer": "https://ais.studio",
                "X-Title": "Fluxion AI",
              }
            });

            const response = await openrouter.chat.completions.create({
              model: actualModel,
              messages: [
                ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
                ...messages
              ],
              temperature: temperature ?? 0.7,
              max_tokens: max_tokens ?? 4096,
            });

            return res.json({ text: response.choices[0].message.content });
          } catch (err: any) {
            lastOrError = err;
            console.error(`[OpenRouter Key Error] Rotating key due to: ${err.message}`);
            
            // Common errors to rotate on: 401 (Auth), 402 (Payment), 429 (Rate Limit), 503 (Overloaded)
            if (err.status === 401 || err.status === 402 || err.status === 429 || err.status === 503) {
              continue;
            }
            break;
          }
        }

        let details = lastOrError?.message || "Erro desconhecido no OpenRouter";
        if (lastOrError?.status === 402) details = "Saldo insuficiente no OpenRouter em todas as chaves (402).";
        if (lastOrError?.status === 429) details = "Limite de taxa atingido no OpenRouter (429). Aguarde um instante.";
        if (lastOrError?.status === 401) details = "Chaves do OpenRouter inválidas ou expiradas.";

        return res.status(lastOrError?.status || 500).json({
          error: "Falha Geral no OpenRouter",
          details: details
        });
      }

      // 6. Fallback: Catch-all error for unhandled models
      return res.status(400).json({ 
        error: "Modelo não suportado", 
        details: `O modelo '${model}' não possui um provedor configurado no servidor.` 
      });

    } catch (error: any) {
      console.error("Detailed AI API Error:", error);
      return res.status(500).json({ 
        error: error.message || "An unexpected error occurred on the server.",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    console.log("Initializing Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware initialized.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist path not found, API only mode active.");
    }
  }

  // Only listen in non-serverless environments
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export const app = startServer();
export default app;
