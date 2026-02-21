import { GoogleGenerativeAI } from "@google/generative-ai";
import initialKnowledge from "../data/knowledge.json";

// Lấy danh sách API Keys từ .env
const API_KEYS = import.meta.env.VITE_GEMINI_API_KEYS ? import.meta.env.VITE_GEMINI_API_KEYS.split(',') : [];
let currentKeyIndex = 0;

function getGenAI() {
  const key = API_KEYS[currentKeyIndex % API_KEYS.length];
  return new GoogleGenerativeAI(key);
}

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`🔄 Đã xoay sang API Key index: ${currentKeyIndex}`);
}

const EMB_MODEL = "gemini-embedding-001";
const CHAT_MODEL = "gemini-1.5-flash";

/**
 * Tính Cosine Similarity
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// Tự động chọn URL API: Gọi Serverless trên Vercel (Prod) hoặc Localhost 3001 (Dev)
const API_URL = import.meta.env.PROD ? '/api/knowledge' : 'http://localhost:3001/api/knowledge';

/**
 * Lấy knowledge từ Backend (Server/Google Sheets) để luôn cập nhật
 */
async function getKnowledge() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return data;
  } catch (error) {
    console.warn("⚠️ Không gọi được Server, dùng localStorage dự phòng...");
    const saved = localStorage.getItem('knowledge_base');
    if (saved) return JSON.parse(saved);
    return initialKnowledge;
  }
}

/**
 * Hàm gọi API với cơ chế Retry & Rotate Key
 */
async function callWithRetry(fn) {
  let attempts = 0;
  const maxAttempts = API_KEYS.length * 2;

  while (attempts < maxAttempts) {
    try {
      return await fn(getGenAI());
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('quota');
      if (isRateLimit) {
        rotateKey();
        attempts++;
        await new Promise(r => setTimeout(r, 1000)); // Đợi 1s
        continue;
      }
      throw error;
    }
  }
  throw new Error("Tất cả API Keys đều hết hạn hoặc lỗi.");
}

export async function computeEmbedding(text) {
  return await callWithRetry(async (genAI) => {
    const model = genAI.getGenerativeModel({ model: EMB_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  });
}

async function retrieveContext(query, topK = 3) {
  const queryEmb = await computeEmbedding(query);
  const kb = await getKnowledge();


  // Chỉ những mục đã có nhúng (embedding) mới được tìm kiếm chính xác
  const scoredKB = kb.map(item => {
    if (!item.embedding) return { ...item, score: 0 };
    return {
      ...item,
      score: cosineSimilarity(queryEmb, item.embedding)
    };
  });

  return scoredKB
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function askBot(query, history = []) {
  try {
    const hits = await retrieveContext(query);
    const relevantHits = hits.filter(h => h.score > 0.35);

    let context = "Không có thông tin phù hợp.";
    if (relevantHits.length > 0) {
      context = relevantHits.map(h => `[${h.topic}] ${h.q}: ${h.a}`).join("\n---\n");
    }

    return await callWithRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: CHAT_MODEL,
        systemInstruction: "Bạn là trợ lý hỗ trợ vận hành GHN. Nhiệm vụ của bạn là trả lời câu hỏi dựa trên CONTEXT được cung cấp.\nLƯU Ý QUAN TRỌNG:\n- Nếu CONTEXT có thông tin liên quan (ví dụ: quy trình) nhưng không có định nghĩa chính xác người dùng hỏi, HÃY DÙNG QUY TRÌNH ĐÓ ĐỂ GIẢI THÍCH.\n- Tuyệt đối không được bịa đặt thông tin không có trong CONTEXT.\n- Trình bày câu trả lời RÕ RÀNG, DỄ ĐỌC. Sử dụng gạch đầu dòng (-) hoặc số thứ tự (1. 2. 3.) cho các bước quy trình. Xuống dòng giữa các ý chính."
      });

      let formattedHistory = history.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      const firstUserIndex = formattedHistory.findIndex(m => m.role === 'user');
      if (firstUserIndex !== -1) formattedHistory = formattedHistory.slice(firstUserIndex);
      else formattedHistory = [];

      const chat = model.startChat({ history: formattedHistory });
      const prompt = `CONTEXT:\n${context}\n\nCÂU HỎI: ${query}`;
      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      return {
        text: response.text(),
        sources: relevantHits
      };
    });
  } catch (error) {
    return { text: "⚠️ Lỗi: " + error.message, sources: [] };
  }
}
