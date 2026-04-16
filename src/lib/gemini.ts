import { GoogleGenAI, Type } from "@google/genai";
import { Question, SimilarQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function performOCR(base64Image: string, mimeType: string = "image/jpeg"): Promise<Question> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: `请识别图片中的错题。提取以下信息：
            1. 题目正文 (content)
            2. 选项 (options) - 如果是选择题，请列出所有选项
            3. 标准答案 (answer) - 如果图片中有
            4. 用户原答案 (userAnswer) - 如果图片中有用户手写或勾选的答案
            5. 题目解析 (explanation) - 详细解析题目
            6. 核心知识点 (knowledgePoint) - 例如“一元二次方程根的判别式”
            
            请以 JSON 格式返回。确保输出是纯 JSON，不要包含 markdown 代码块标记。`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answer: { type: Type.STRING },
          userAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          knowledgePoint: { type: Type.STRING },
        },
        required: ["content", "knowledgePoint"],
      },
    },
  });

  let text = response.text || "{}";
  // Remove potential markdown blocks
  text = text.replace(/```json\n?|```/g, "").trim();
  
  const result = JSON.parse(text);
  return {
    id: Math.random().toString(36).substring(7),
    ...result,
  };
}

export async function generateSimilarQuestions(originalQuestion: Question): Promise<SimilarQuestion[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `基于以下原题及其知识点“${originalQuestion.knowledgePoint}”，生成 3 道相似的变式题（举一反三）。
            原题内容：${originalQuestion.content}
            
            要求：
            1. 覆盖同一知识点的不同角度或变式。
            2. 难度与原题相当或略有梯度。
            3. 每道题附带正确答案和侧重易错点的解析。
            
            请以 JSON 格式返回一个数组，每个元素包含：
            - content: 题目正文
            - options: 选项数组（如果没有则为空数组）
            - answer: 正确答案
            - explanation: 解析
            - commonMistakeAnalysis: 易错点分析
            - knowledgePoint: 知识点（与原题一致）`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            commonMistakeAnalysis: { type: Type.STRING },
            knowledgePoint: { type: Type.STRING },
          },
          required: ["content", "answer", "explanation", "commonMistakeAnalysis"],
        },
      },
    },
  });

  const results = JSON.parse(response.text || "[]");
  return results.map((q: any) => ({
    id: Math.random().toString(36).substring(7),
    ...q,
  }));
}
