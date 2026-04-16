import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, Trash2, Eye, FileDown, Loader2, ChevronRight } from "lucide-react";
import { NotebookEntry } from '../types';
import { toast } from "sonner";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface NotebookProps {
  entries: NotebookEntry[];
  onDelete: (id: string) => void;
}

export default function Notebook({ entries, onDelete }: NotebookProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
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
    toast.info("正在准备打印文件...");

    try {
      // Small delay to ensure the print hidden div is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = printRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`错题本_${new Date().toLocaleDateString()}.pdf`);
      toast.success("PDF 已生成并开始下载");
    } catch (error) {
      console.error(error);
      toast.error("生成 PDF 失败");
    } finally {
      setIsPrinting(false);
    }
  };

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
        <div className="grid gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className={`geometric-card transition-all relative ${selectedIds.includes(entry.id) ? 'ring-2 ring-primary border-primary' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
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
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Eye size={18} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-xl">
                      <div className="p-6 border-b border-border bg-card shrink-0">
                        <DialogTitle className="text-xl font-extrabold text-primary">错题详情</DialogTitle>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">
                          <section className="space-y-4">
                            <div className="geometric-label">原错题</div>
                            <div className="geometric-ocr-text">
                              <p className="leading-relaxed">{entry.originalQuestion.content}</p>
                              <div className="mt-4 pt-4 border-t border-border space-y-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase">标准答案</p>
                                <p className="text-sm font-medium">{entry.originalQuestion.answer}</p>
                              </div>
                            </div>
                          </section>

                          <section className="space-y-4">
                            <div className="geometric-label">举一反三变式题</div>
                            <div className="space-y-4">
                              {entry.similarQuestions.map((q, i) => (
                                <div key={q.id} className="geometric-card bg-slate-50/50">
                                  <div className="flex justify-between mb-2">
                                    <span className="font-extrabold text-[11px] text-muted-foreground uppercase">变式题 0{i + 1}</span>
                                  </div>
                                  <p className="text-sm leading-relaxed mb-4">{q.content}</p>
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
                          </section>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
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
              <div className="geometric-ocr-text line-clamp-2 mb-3">
                {entry.originalQuestion.content}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1">
                  <FileDown size={12} /> 包含 3 道变式题
                </span>
                <ChevronRight size={16} className="text-muted-foreground" />
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
