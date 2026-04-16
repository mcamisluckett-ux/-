import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Camera, Check, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { performOCR, generateSimilarQuestions } from '../lib/gemini';
import { Question, SimilarQuestion, NotebookEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface OCRScannerProps {
  onSave: (entry: NotebookEntry) => void;
}

export default function OCRScanner({ onSave }: OCRScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsProcessing(true);
    setQuestion(null);
    setSimilarQuestions([]);
    try {
      const base64Data = base64.split(',')[1];
      const result = await performOCR(base64Data);
      setQuestion(result);
      toast.success("识别成功！");
    } catch (error) {
      console.error(error);
      toast.error("识别失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSimilar = async () => {
    if (!question) return;
    setIsGenerating(true);
    try {
      const results = await generateSimilarQuestions(question);
      setSimilarQuestions(results);
      toast.success("举一反三题目已生成！");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      toast.error("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!question || similarQuestions.length === 0) return;
    const entry: NotebookEntry = {
      id: Math.random().toString(36).substring(7),
      originalQuestion: question,
      similarQuestions: similarQuestions,
      createdAt: Date.now(),
    };
    onSave(entry);
    toast.success("已保存到错题本");
    // Reset
    setImage(null);
    setQuestion(null);
    setSimilarQuestions([]);
  };

  return (
    <div className="space-y-6">
      {!image ? (
        <div className="geometric-card border-dashed border-2 flex flex-col items-center justify-center p-12 bg-white/50 cursor-pointer hover:bg-white transition-colors" onClick={() => fileInputRef.current?.click()}>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload}
          />
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-lg font-semibold">拍照或上传错题</h3>
          <p className="text-sm text-muted-foreground mt-1">支持图片中的文字和公式识别</p>
          <Button variant="outline" className="mt-6 gap-2">
            <Camera size={18} />
            立即拍照
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <div className="space-y-6">
            <div className="geometric-card overflow-hidden p-0">
              <div className="relative aspect-video bg-slate-100 flex items-center justify-center border-b border-border">
                <img src={image} alt="Uploaded" className="max-h-full object-contain opacity-80" />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute top-2 right-2 gap-1 h-7 text-[11px]"
                  onClick={() => { setImage(null); setQuestion(null); setSimilarQuestions([]); }}
                >
                  <RefreshCw size={12} /> 重新上传
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="geometric-card p-8 flex flex-col items-center justify-center gap-4 animate-pulse">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-sm font-medium text-muted-foreground">正在智能识别题目内容...</p>
              </div>
            )}

            {question && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="geometric-card">
                  <div className="geometric-label">核心知识点</div>
                  <div className="geometric-badge mb-4">{question.knowledgePoint}</div>
                  <p className="text-[13px] text-muted-foreground leading-[1.5]">
                    该题考察 {question.knowledgePoint} 相关的核心概念与应用。
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {question && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="geometric-card">
                    <div className="geometric-label">原题识别内容</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Textarea 
                          value={question.content} 
                          onChange={(e) => setQuestion({...question, content: e.target.value})}
                          className="min-h-[100px] bg-[#fcfcfc] border-l-[3px] border-border"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">标准答案</label>
                          <Input 
                            value={question.answer} 
                            onChange={(e) => setQuestion({...question, answer: e.target.value})}
                            className="bg-gray-50/50 h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">用户原答案</label>
                          <Input 
                            value={question.userAnswer || ''} 
                            onChange={(e) => setQuestion({...question, userAnswer: e.target.value})}
                            className="bg-gray-50/50 h-9 text-sm"
                            placeholder="未识别到"
                          />
                        </div>
                      </div>
                      
                      {!isGenerating && similarQuestions.length === 0 && (
                        <Button className="w-full gap-2 py-6 text-base font-bold" onClick={handleGenerateSimilar}>
                          <Sparkles size={18} />
                          生成举一反三推荐 (3道)
                        </Button>
                      )}
                    </div>
                  </div>

                  {isGenerating && (
                    <div className="geometric-card p-8 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="text-sm font-medium text-muted-foreground">正在基于知识点生成变式题...</p>
                    </div>
                  )}

                  {similarQuestions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="geometric-label mb-0">举一反三推荐 (3道)</div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={handleGenerateSimilar}>
                            <RefreshCw size={14} className="mr-1" /> 重新生成
                          </Button>
                          <Button size="sm" className="h-8 text-[12px]" onClick={handleSave}>
                            <Save size={14} className="mr-1" /> 保存到错题本
                          </Button>
                        </div>
                      </div>
                      
                      {similarQuestions.map((q, idx) => (
                        <div key={q.id} className="geometric-card">
                          <div className="flex justify-between mb-3">
                            <span className="font-extrabold text-[12px] text-muted-foreground uppercase">题目 0{idx + 1}</span>
                            <span className="text-[11px] text-amber-500 font-bold">难度：★★★☆☆</span>
                          </div>
                          <div className="geometric-ocr-text mb-4">{q.content}</div>
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <span className="text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">答案:</span>
                              <p className="text-sm">{q.answer}</p>
                            </div>
                            <div className="geometric-analysis">
                              <b>易错点解析：</b> {q.commonMistakeAnalysis}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
