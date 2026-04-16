/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen, Camera, History, Printer } from "lucide-react";
import OCRScanner from './components/OCRScanner';
import Notebook from './components/Notebook';
import { NotebookEntry } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState("scan");
  const [entries, setEntries] = useState<NotebookEntry[]>([]);

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wrong_questions_entries');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }
  }, []);

  // Save entries to localStorage
  useEffect(() => {
    localStorage.setItem('wrong_questions_entries', JSON.stringify(entries));
  }, [entries]);

  const addEntry = (entry: NotebookEntry) => {
    setEntries(prev => [entry, ...prev]);
    setActiveTab("notebook");
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <header className="h-16 bg-card border-b-2 border-border flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-[4px]" />
          <h1 className="text-[20px] font-extrabold text-primary tracking-tight">错题举一反三打印机</h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <TabsContent value="scan" className="h-full m-0 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-6">
                <OCRScanner onSave={addEntry} />
              </div>
            </TabsContent>
            <TabsContent value="notebook" className="h-full m-0 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-6">
                <Notebook entries={entries} onDelete={deleteEntry} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <nav className="h-16 bg-card border-t-2 border-border flex justify-center gap-12 shrink-0">
        <button 
          onClick={() => setActiveTab("scan")}
          className={`flex flex-col items-center justify-center px-6 transition-all relative ${activeTab === 'scan' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {activeTab === 'scan' && <div className="absolute top-[-2px] left-0 right-0 h-[3px] bg-primary" />}
          <Camera size={20} className="mb-1" />
          <span className="text-[12px] font-medium">错题识别</span>
        </button>
        <button 
          onClick={() => setActiveTab("notebook")}
          className={`flex flex-col items-center justify-center px-6 transition-all relative ${activeTab === 'notebook' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {activeTab === 'notebook' && <div className="absolute top-[-2px] left-0 right-0 h-[3px] bg-primary" />}
          <History size={20} className="mb-1" />
          <span className="text-[12px] font-medium">历史错题本</span>
        </button>
      </nav>

      <Toaster position="top-center" />
    </div>
  );
}
