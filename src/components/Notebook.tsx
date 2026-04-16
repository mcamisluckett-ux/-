import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, Trash2, Eye, FileDown, Loader2, ChevronRight, ArrowLeft, History } from "lucide-react";
import { NotebookEntry } from '../types';
import { toast } from "sonner";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion } from 'motion/react';

interface NotebookProps {
  entries: NotebookEntry[];
  onDelete: (id: string) => void;
}

export default function Notebook({ entries, onDelete }: NotebookProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<NotebookEntry | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map(e => e.id));
    }
  };

  const handlePrint = async () => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要打印的错题");
      return;
    }

    setIsPrinting(true);
    const toastId = toast.loading("正在生成 PDF，请稍候...");

    try {
      // Wait for the hidden element to be ready
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = printRef.current;
      if (!element) throw new Error("打印节点未找到");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`错题本_${new Date().getTime()}.pdf`);
      toast.dismiss(toastId);
      toast.success("PDF 已成功下载");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.dismiss(toastId);
      toast.error("生成 PDF 失败，请检查浏览器权限");
    } finally {
      setIsPrinting(false);
    }
  };

  if (viewingEntry) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pb-20"
      >
        <div className="flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm py-2">
          <Button 
            variant="ghost" 
            onClick={() => setViewingEntry(null)}
            className="gap-2 font-bold text-primary hover:bg-primary/5"
          >
            <ArrowLeft size={18} /> 返回列表
          </Button>
          <div className="geometric-badge">
            {viewingEntry.originalQuestion.knowledgePoint}
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="geometric-label">原错题内容</div>
            <div className="geometric-card bg-white">
              <div className="geometric-ocr-text whitespace-pre-wrap leading-relaxed text-[15px]">
                {viewingEntry.originalQuestion.content}
              </div>
              <div className="mt-6 pt-6 border-t-2 border-dashed border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[11px] font-black text-muted-foreground uppercase mb-1">标准答案</p>
                    <p className="text-sm font-bold text-foreground">{viewingEntry.originalQuestion.answer}</p>
                  </div>
                  <div className="p-3 bg-red-50/50 rounded-lg">
                    <p className="text-[11px] font-black text-muted-foreground uppercase mb-1">你的答案</p>
                    <p className="text-sm font-bold text-destructive">{viewingEntry.originalQuestion.userAnswer || '未填写'}</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                  <p className="text-[11px] font-black text-primary uppercase mb-1">解析说明</p>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{viewingEntry.originalQuestion.explanation}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="geometric-label">举一反三变式练习</div>
            <div className="grid gap-6">
              {viewingEntry.similarQuestions.map((q, i) => (
                <div key={q.id} className="geometric-card bg-slate-50/50 border-l-[4px] border-l-primary/30">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black text-[12px] text-primary/60 uppercase tracking-widest">变式题 0{i + 1}</span>
                    <span className="text-[11px] text-amber-500 font-black">难度：★★★☆☆</span>
                  </div>
                  <p className="text-[15px] leading-relaxed mb-6 text-foreground font-medium">{q.content}</p>
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded mt-0.5">答案</div>
                      <p className="text-sm font-bold">{q.answer}</p>
                    </div>
                    <div className="geometric-analysis">
                      <span className="font-black text-primary">易错点拨：</span> {q.commonMistakeAnalysis}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-card p-4 rounded-[8px] border-2 border-border sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Checkbox 
            checked={selectedIds.length === entries.length && entries.length > 0} 
            onCheckedChange={toggleSelectAll}
            className="w-5 h-5"
          />
          <span className="text-[14px] font-bold text-foreground">全选 ({selectedIds.length}/{entries.length})</span>
        </div>
        <Button 
          disabled={selectedIds.length === 0 || isPrinting} 
          onClick={handlePrint}
          className="gap-2 h-10 font-bold"
        >
          {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
          打印 PDF
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <History size={64} strokeWidth={1} className="opacity-20" />
          <p className="text-sm font-medium">暂无错题记录，快去识别第一道错题吧</p>
        </div>
      ) : (
        <div className="grid gap-4 pb-20">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              className={`geometric-card transition-all relative group cursor-pointer hover:border-primary/50 ${selectedIds.includes(entry.id) ? 'ring-2 ring-primary border-primary' : ''}`}
              onClick={() => setViewingEntry(entry)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.includes(entry.id)} 
                    onCheckedChange={() => toggleSelect(entry.id)}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="geometric-badge mb-1">{entry.originalQuestion.knowledgePoint}</div>
                    <p className="text-[11px] text-muted-foreground font-medium">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
              <div className="geometric-ocr-text line-clamp-2 mb-3 text-[14px]">
                {entry.originalQuestion.content}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1">
                  <FileDown size={12} /> 包含 3 道变式题
                </span>
                <div className="flex items-center text-primary text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  查看详情 <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden element for PDF generation */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={printRef} className="w-[800px] bg-white p-12 font-sans text-[#0f172a]">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-4 border-[#2563eb]">
            <div className="w-8 h-8 bg-[#2563eb] rounded-[4px]" />
            <h1 className="text-3xl font-black text-[#2563eb] tracking-tighter">错题举一反三练习集</h1>
          </div>
          
          {entries
            .filter(e => selectedIds.includes(e.id))
            .map((entry, index) => (
              <div key={entry.id} className="mb-16 break-inside-avoid">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-[#0f172a] text-white px-4 py-1.5 text-xl font-black rounded-[4px]">第 {index + 1} 组</span>
                  <div className="h-[2px] flex-1 bg-[#e2e8f0]" />
                  <span className="text-[#64748b] font-bold uppercase text-sm tracking-widest">知识点：{entry.originalQuestion.knowledgePoint}</span>
                </div>
                
                <div className="space-y-10">
                  <div className="p-8 border-2 border-[#e2e8f0] rounded-[8px] bg-[#fcfcfc]">
                    <div className="text-[12px] font-black text-[#64748b] uppercase mb-4 flex items-center gap-2">
                      <div className="w-[3px] h-[12px] bg-[#2563eb]" /> 原错题
                    </div>
                    <p className="text-xl leading-relaxed mb-6 font-medium">{entry.originalQuestion.content}</p>
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-[#e2e8f0]">
                      <p className="text-[11px] font-black text-[#64748b] uppercase mb-2">答案与解析</p>
                      <p className="text-lg font-bold">{entry.originalQuestion.answer}</p>
                      <p className="text-base text-[#64748b] italic mt-2 leading-relaxed">{entry.originalQuestion.explanation}</p>
                    </div>
                  </div>

                  <div className="grid gap-8">
                    {entry.similarQuestions.map((q, qIndex) => (
                      <div key={q.id} className="p-8 border-2 border-[#e2e8f0] rounded-[8px]">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-[12px] font-black text-[#64748b] uppercase flex items-center gap-2">
                            <div className="w-[3px] h-[12px] bg-[#2563eb]" /> 变式题 0{qIndex + 1}
                          </div>
                          <span className="text-[11px] text-[#f59e0b] font-black">难度：★★★☆☆</span>
                        </div>
                        <p className="text-xl leading-relaxed mb-6">{q.content}</p>
                        <div className="mt-8 pt-6 border-t-2 border-dashed border-[#e2e8f0]">
                          <p className="text-[11px] font-black text-[#64748b] uppercase mb-2">答案与解析</p>
                          <p className="text-lg font-bold">{q.answer}</p>
                          <p className="text-base text-[#64748b] italic mt-2 leading-relaxed">{q.explanation}</p>
                          <div className="mt-4 p-4 bg-[#f0fdf4] rounded-[4px] text-base text-[#15803d] border-l-4 border-[#10b981]">
                            <span className="font-black">易错点分析：</span>{q.commonMistakeAnalysis}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          <div className="text-center text-[#64748b] text-xs mt-12 pt-8 border-t border-[#e2e8f0] font-bold uppercase tracking-widest">
            Generated by 错题举一反三打印机 | {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
