import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './utils/firebase';
import { AuthScreen } from './components/AuthScreen';
import { ProjectPlan, Task, ProcessedTask, CalendarNote, TaskNote } from './types';
import { DEFAULT_PROJECT_PLAN } from './constants';
import { calculateProjectSchedule, calculateDailyWorkload } from './utils/scheduler';
import { analyzeProjectPlan, AnalysisResult } from './utils/insightEngine';

// Components
import { ProjectChart } from './components/ProjectChart';
import { ProjectTable } from './components/ProjectTable';
import { JsonEditor } from './components/JsonEditor';
import { GanttChart } from './components/GanttChart';
import { WorkloadChart } from './components/WorkloadChart';
import { InsightPanel } from './components/InsightPanel';
import { CapacitySimulatorChart } from './components/CapacitySimulatorChart';
import { ChatBot } from './components/ChatBot';
import { ImageGenerator } from './components/ImageGenerator';
import { CloudSyncModal } from './components/CloudSyncModal';
import { LiveAudioBot } from './components/LiveAudioBot';
import { DateNoteModal } from './components/DateNoteModal';
import { TaskNoteModal } from './components/TaskNoteModal';
import { FeedbackModal } from './components/FeedbackModal';
import { GoalCard } from './components/GoalCard';
import { CalendarWidget } from './components/CalendarWidget';

// Isolated Clock Component to prevent app-wide re-renders
const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
        setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-center">
        <div className="text-xl font-mono font-bold text-slate-700 dark:text-slate-200 leading-none">
            {now.toLocaleTimeString()}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
    </div>
  );
};

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // State
  const [projectData, setProjectData] = useState<ProjectPlan>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('agientek_plan');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && (!parsed.smart_goal || parsed.smart_goal.includes('Lose 6 kg'))) {
            return DEFAULT_PROJECT_PLAN;
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse saved plan", e);
        }
      }
    }
    return DEFAULT_PROJECT_PLAN;
  });

  const [weekdayHours, setWeekdayHours] = useState(6);
  const [weekendHours, setWeekendHours] = useState(2);
  const [bufferPercent, setBufferPercent] = useState(30);
  const [isLocked, setIsLocked] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Derived Values
  const projectStartDate = useMemo(() => {
    if (projectData.project_start_date) {
      const [y, m, d] = projectData.project_start_date.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [projectData.project_start_date]);

  // Modals
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{isOpen: boolean, title: string, message: string, type: 'error'|'info'|'success'}>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  const [dateNoteModal, setDateNoteModal] = useState<{isOpen: boolean, date: Date | null}>({isOpen: false, date: null});
  const [taskNoteModal, setTaskNoteModal] = useState<{isOpen: boolean, task: ProcessedTask | null}>({isOpen: false, task: null});

  // Effects
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        // Allow access to any authenticated user
        setUser(currentUser);
        setAuthLoading(false);
      }, (err) => {
        console.warn("Auth state error:", err);
        setAuthLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase auth not initialized:", e);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('agientek_plan', JSON.stringify(projectData));
  }, [projectData]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Helpers
  const getInputValue = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // --- SCHEDULE CALCULATIONS ---

  // 1. Main Schedule (Current State)
  const processedTasks = useMemo(() => 
    calculateProjectSchedule(
      projectData.tasks, 
      weekdayHours, 
      weekendHours, 
      projectStartDate,
      new Date(), // Current date for execution context
      projectData.non_working_days || []
    ), 
  [projectData, weekdayHours, weekendHours, projectStartDate]);

  // Helper for baseline source (pure estimates, ignoring completion)
  const baselineTasksSource = useMemo(() => {
    return projectData.tasks.map(t => ({...t, isCompleted: false, completionDate: undefined, hoursCompleted: 0}));
  }, [projectData.tasks]);

  // 2. Baseline (Ghost): Pure estimates, default capacity, from start
  const baselineTasks = useMemo(() => {
    return calculateProjectSchedule(
        baselineTasksSource,
        weekdayHours,
        weekendHours,
        projectStartDate,
        undefined, // No 'now' context
        projectData.non_working_days || []
    );
  }, [baselineTasksSource, weekdayHours, weekendHours, projectStartDate, projectData.non_working_days]);

  // 3. Baseline Realistic (Ghost): Estimates + Buffer, default capacity
  const baselineRealisticTasks = useMemo(() => {
    const buffered = baselineTasksSource.map(t => ({...t, duration_hours: t.duration_hours * (1 + bufferPercent/100)}));
    return calculateProjectSchedule(
        buffered,
        weekdayHours,
        weekendHours,
        projectStartDate,
        undefined,
        projectData.non_working_days || []
    );
  }, [baselineTasksSource, weekdayHours, weekendHours, bufferPercent, projectStartDate, projectData.non_working_days]);

  // 4. Baseline Max Velocity (Ghost): Pure estimates, Max capacity (10/5)
  const baselineMaxVelocityTasks = useMemo(() => {
    return calculateProjectSchedule(
        baselineTasksSource,
        10,
        5,
        projectStartDate,
        undefined,
        projectData.non_working_days || []
    );
  }, [baselineTasksSource, projectStartDate, projectData.non_working_days]);

  // 5. Current Max Velocity (Overlay): Current state, Max capacity
  const maxVelocityTasks = useMemo(() => {
    return calculateProjectSchedule(
        projectData.tasks,
        10,
        5,
        projectStartDate,
        new Date(), // Use 'now'
        projectData.non_working_days || []
    );
  }, [projectData.tasks, projectStartDate, projectData.non_working_days]);

  // 6. Realistic Tasks (Overlay): Current state + Buffer
  const realisticTasks = useMemo(() => 
    calculateProjectSchedule(
      projectData.tasks.map(t => ({...t, duration_hours: t.duration_hours * (1 + bufferPercent/100)})), 
      weekdayHours, 
      weekendHours, 
      projectStartDate,
      new Date(),
      projectData.non_working_days || []
    ), [projectData, weekdayHours, weekendHours, bufferPercent, projectStartDate]);

  const dailyWorkload = useMemo(() => 
    calculateDailyWorkload(processedTasks, weekdayHours, weekendHours, projectData.non_working_days || []),
  [processedTasks, weekdayHours, weekendHours, projectData.non_working_days]);

  const analysis = useMemo(() => 
    analyzeProjectPlan(projectData.tasks, weekdayHours, weekendHours, bufferPercent),
  [projectData.tasks, weekdayHours, weekendHours, bufferPercent]);

  
  const finishDate = processedTasks.length > 0 
        ? processedTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, new Date(0)) 
        : new Date();
  const totalDurationDays = Math.ceil((finishDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));

  const realisticFinishDate = realisticTasks.length > 0 
      ? realisticTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, new Date(0)) 
      : new Date();
  const realisticDurationDays = Math.ceil((realisticFinishDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Handlers
  const handleForceTaskToToday = (taskId: string) => {
      setProjectData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id === taskId) {
                  const updates: Partial<Task> = {
                      forcedDate: getInputValue(new Date()) // Set to YYYY-MM-DD
                  };
                  // If task is completed, ensure its completion anchor also moves to today
                  if (t.isCompleted) {
                      updates.completionDate = new Date().toISOString();
                  }
                  return { ...t, ...updates };
              }
              return t;
          })
      }));
  };
  
  const handleRevertForcedTask = (taskId: string) => {
      setProjectData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id === taskId) {
                  const { forcedDate, ...rest } = t; 
                  return { ...rest };
              }
              return t;
          })
      }));
  };

  const handleToggleNonWorkingDay = (dateStrOrArray: string | string[], forceState?: boolean) => {
      // In Execution Mode (Locked), we only allow BLOCKING days (forceState === true).
      // We do NOT allow unblocking days (forceState === false).
      if (isLocked) {
          if (forceState === false) {
              setFeedback({
                  isOpen: true,
                  title: "Plan Locked",
                  message: "You cannot unmark/restore working days in Execution Mode. Only adding new blocks is allowed.",
                  type: "error"
              });
              return;
          }
          // If forceState is undefined (toggle), check if we would be removing any days.
          if (forceState === undefined) {
             const current = projectData.non_working_days || [];
             const targets = Array.isArray(dateStrOrArray) ? dateStrOrArray : [dateStrOrArray];
             const impliesRemoval = targets.some(t => current.includes(t));
             
             if (impliesRemoval) {
                 setFeedback({
                    isOpen: true,
                    title: "Plan Locked",
                    message: "You cannot unmark/restore working days in Execution Mode.",
                    type: "error"
                 });
                 return;
             }
          }
      }

      setProjectData(prev => {
          const current = prev.non_working_days || [];
          let newNonWorking = [...current];

          const targets = Array.isArray(dateStrOrArray) ? dateStrOrArray : [dateStrOrArray];

          if (forceState !== undefined) {
             if (forceState) {
                 // Add (Block)
                 const toAdd = targets.filter(t => !newNonWorking.includes(t));
                 newNonWorking = [...newNonWorking, ...toAdd];
             } else {
                 // Remove (Unblock)
                 newNonWorking = newNonWorking.filter(t => !targets.includes(t));
             }
          } else {
             // Toggle behavior for single items
             targets.forEach(t => {
                 if (newNonWorking.includes(t)) {
                     newNonWorking = newNonWorking.filter(x => x !== t);
                 } else {
                     newNonWorking.push(t);
                 }
             });
          }
          
          return {
              ...prev,
              non_working_days: newNonWorking
          };
      });
  };

  const handleTaskToggle = (taskId: string) => {
      setProjectData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id === taskId) {
                  const newStatus = !t.isCompleted;
                  return {
                      ...t,
                      isCompleted: newStatus,
                      completionDate: newStatus ? new Date().toISOString() : undefined,
                      hoursCompleted: newStatus ? t.duration_hours : 0
                  };
              }
              return t;
          })
      }));
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setProjectData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    }));
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    if (isLocked) {
        setFeedback({
            isOpen: true,
            title: "Plan Locked",
            message: "Cannot reorder tasks while in Execution Mode.",
            type: "error"
        });
        return;
    }
    const newTasks = [...projectData.tasks];
    if (direction === 'up' && index > 0) {
        [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
    } else if (direction === 'down' && index < newTasks.length - 1) {
        [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
    }
    setProjectData(prev => ({ ...prev, tasks: newTasks }));
  };

  const handleRepeatTask = (taskId: string, frequency: 'weekly' | 'monthly') => {
      if (isLocked) {
          setFeedback({ isOpen: true, title: "Plan Locked", message: "Cannot generate new recurring tasks in Execution Mode.", type: "error" });
          return;
      }

      setProjectData(prev => {
          const sourceTask = prev.tasks.find(t => t.id === taskId);
          if (!sourceTask) return prev;

          const newTasks = [...prev.tasks];
          
          // Determine anchor date
          let baseDateStr = sourceTask.forcedDate || getInputValue(projectStartDate);
          // If task has calculated schedule, prefer that for anchor if no forcedDate? 
          // Actually, let's just stick to forcedDate or project start for simplicity of "corresponding day".
          // If a task is "monthly" and project starts Jan 20, we want Feb 20, Mar 20.
          
          const [y, m, d] = baseDateStr.split('-').map(Number);
          const anchorDate = new Date(y, m - 1, d);
          
          // 6 Month Limit
          const limitDate = new Date(projectStartDate);
          limitDate.setMonth(limitDate.getMonth() + 6);

          let nextDate = new Date(anchorDate);
          let count = 0;

          // Helper to increment date cleanly
          const advanceDate = (current: Date) => {
               const n = new Date(current);
               if (frequency === 'weekly') {
                   n.setDate(n.getDate() + 7);
               } else {
                   // Robust Monthly Add: Maintain day of month where possible
                   const targetMonth = n.getMonth() + 1;
                   n.setMonth(targetMonth);
                   // Check for day overflow (e.g., Jan 31 -> Feb 28)
                   if (n.getDate() !== current.getDate()) {
                       // We overflowed. Set to last day of previous month (the target month)
                       n.setDate(0); 
                   }
               }
               return n;
          };

          // Advance once for the first clone (Instance 0 is the original)
          nextDate = advanceDate(nextDate);

          while (nextDate <= limitDate && count < 50) { // Safety break
              const newId = crypto.randomUUID();
              const dateStr = getInputValue(nextDate);
              
              const clone: Task = {
                  ...sourceTask,
                  id: newId,
                  task_name: `${sourceTask.task_name} (${dateStr})`, // Append date for clarity
                  forcedDate: dateStr,
                  isCompleted: false,
                  completionDate: undefined,
                  hoursCompleted: 0,
                  recurrence: null, // Clones are not templates
                  predecessors: [] // Decouple from dependency chain to prevent cyclic messes. Recurring tasks are time-bound.
              };
              
              newTasks.push(clone);
              nextDate = advanceDate(nextDate);
              count++;
          }
          
          // Mark original as the template
          const updatedSourceIndex = newTasks.findIndex(t => t.id === taskId);
          if (updatedSourceIndex >= 0) {
              newTasks[updatedSourceIndex] = {
                  ...newTasks[updatedSourceIndex],
                  recurrence: frequency
              };
          }

          return { ...prev, tasks: newTasks };
      });

      setFeedback({
          isOpen: true,
          title: "Tasks Generated",
          message: `Generated recurring instances for the next 6 months based on ${frequency} schedule.`,
          type: "success"
      });
  };

  const handleApplyOptimizations = (newTasks: Task[]) => {
      setProjectData(prev => ({
          ...prev,
          tasks: newTasks
      }));
      setFeedback({
          isOpen: true,
          title: "Plan Optimized",
          message: "Tasks have been updated based on AI recommendations.",
          type: "success"
      });
  };

  const handleChunkClick = (taskId: string, targetHours: number) => {
      setProjectData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => {
              if (t.id === taskId) {
                   // If visual progress meets or exceeds duration, mark fully done
                   const isFullyDone = targetHours >= (t.duration_hours - 0.05); // Tolerance for float
                   return { 
                       ...t, 
                       hoursCompleted: targetHours,
                       isCompleted: isFullyDone,
                       completionDate: isFullyDone ? new Date().toISOString() : (t.isCompleted && !isFullyDone ? undefined : t.completionDate)
                   };
              }
              return t;
          })
      }));
  };

  // Note Handlers
  const handleSaveCalendarNote = (content: string) => {
      if (!dateNoteModal.date) return;
      const dateKey = getInputValue(dateNoteModal.date);
      
      const newNote: CalendarNote = {
          id: crypto.randomUUID(),
          date: dateKey,
          content,
          timestamp: new Date().toISOString()
      };

      setProjectData(prev => ({
          ...prev,
          calendar_notes: [...(prev.calendar_notes || []), newNote]
      }));
      setDateNoteModal({ isOpen: false, date: null });
  };

  const handleSaveTaskNote = (content: string) => {
      if (!taskNoteModal.task) return;
      
      const newNote: TaskNote = {
          id: crypto.randomUUID(),
          taskId: taskNoteModal.task.id,
          content,
          timestamp: new Date().toISOString()
      };

      setProjectData(prev => ({
          ...prev,
          task_notes: [...(prev.task_notes || []), newNote]
      }));
      setTaskNoteModal({ isOpen: false, task: null });
  };

  const handleImageUsageIncrement = () => {
    setProjectData(prev => ({
        ...prev,
        image_generation_count: (prev.image_generation_count || 0) + 1
    }));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400">AGiENTEK</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">Execution Intelligence</span>
                    </h1>
                </div>
                
                {/* Isolated Clock Component */}
                <Clock />

                <div className="flex flex-wrap items-center gap-3">
                     <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                     >
                        {isDarkMode ? '☀️' : '🌙'}
                     </button>
                     <button 
                        onClick={() => setIsCloudModalOpen(true)}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.311a7 7 0 00-11.711 3.139.75.75 0 001.449.389 5.5 5.5 0 019.201-2.466l.312.312h-2.433a.75.75 0 000 1.5h4.193z" clipRule="evenodd" />
                        </svg>
                        Cloud Sync
                     </button>
                     <button 
                        onClick={() => setIsJsonEditorOpen(true)}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                     >
                        JSON Data
                     </button>
                     <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`px-3 py-2 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-2 ${isLocked ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                     >
                        {isLocked ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                                Locked
                            </>
                        ) : (
                             <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M14.5 9h-5V5.5a4.5 4.5 0 00-9 0V9h-.5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2zm-3.5 0v-3.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                                Unlocked
                            </>
                        )}
                     </button>
                     
                     {/* User / Sign In Button */}
                     {user ? (
                        <div className="flex items-center gap-2">
                           <span className="hidden sm:inline-block text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={user.email || ''}>
                              {user.email}
                           </span>
                           <button 
                              onClick={handleLogout}
                              className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-bold uppercase rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5"
                              title="Sign Out"
                           >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                              </svg>
                              <span className="hidden sm:inline">Sign Out</span>
                           </button>
                        </div>
                     ) : (
                        <button 
                           onClick={() => setIsAuthModalOpen(true)}
                           className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1.5"
                           title="Sign In / Sync"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                           </svg>
                           <span>Sign In</span>
                        </button>
                     )}
                </div>
            </header>

            <GoalCard 
                projectData={projectData}
                setProjectData={setProjectData}
                isLocked={isLocked}
                analysis={analysis}
                calculatedTotalHours={analysis.totalHours}
                projectStartDate={projectStartDate}
                finishDate={finishDate}
                totalDurationDays={totalDurationDays}
                realisticFinishDate={realisticFinishDate}
                realisticDurationDays={realisticDurationDays}
                formatShortDate={formatShortDate}
                getInputValue={getInputValue}
            />

            {/* Critical Analysis - Full Width */}
            <div className="w-full">
                <InsightPanel 
                    analysis={analysis}
                    tasks={projectData.tasks}
                    smartGoal={projectData.smart_goal}
                    onApplyOptimizations={handleApplyOptimizations}
                    projectStartDate={projectStartDate}
                    calculatedFinishDate={finishDate}
                />
            </div>

            <ProjectTable 
                tasks={processedTasks} 
                onTaskToggle={handleTaskToggle}
                onForceTask={handleForceTaskToToday}
                onRevertForceTask={handleRevertForcedTask}
                onUpdateTask={handleTaskUpdate}
                isLocked={isLocked}
                onRepeatTask={handleRepeatTask}
                onMoveUp={(idx) => moveTask(idx, 'up')}
                onMoveDown={(idx) => moveTask(idx, 'down')}
            />

            {/* Row 1: Analytics Grid (4-column) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <WorkloadChart 
                    data={dailyWorkload}
                    isDarkMode={isDarkMode}
                    weekdayHours={weekdayHours}
                    setWeekdayHours={setWeekdayHours}
                    weekendHours={weekendHours}
                    setWeekendHours={setWeekendHours}
                    readOnly={isLocked}
                />
                
                <CapacitySimulatorChart 
                    tasks={projectData.tasks}
                    currentWeekday={weekdayHours}
                    currentWeekend={weekendHours}
                    isDarkMode={isDarkMode}
                    bufferPercent={bufferPercent}
                    onBufferChange={setBufferPercent}
                    startDate={projectStartDate}
                    readOnly={isLocked}
                    nonWorkingDays={projectData.non_working_days}
                />

                <CalendarWidget 
                    nonWorkingDays={projectData.non_working_days || []}
                    onToggleDay={handleToggleNonWorkingDay}
                    isReadOnly={isLocked}
                    startDate={projectStartDate}
                />

                <ProjectChart tasks={projectData.tasks} isDarkMode={isDarkMode} />
            </div>

            {/* Main Timeline */}
            <GanttChart 
                tasks={processedTasks}
                baselineTasks={baselineTasks}
                baselineRealisticTasks={baselineRealisticTasks}
                baselineMaxVelocityTasks={baselineMaxVelocityTasks}
                realisticTasks={realisticTasks}
                maxVelocityTasks={maxVelocityTasks}
                weekendHours={weekendHours}
                weekdayHours={weekdayHours}
                isDarkMode={isDarkMode}
                bufferPercent={bufferPercent}
                projectStartDate={projectStartDate}
                currentDate={new Date()}
                onTaskToggle={handleTaskToggle}
                onChunkClick={handleChunkClick}
                onUpdateTask={handleTaskUpdate}
                onForceTask={handleForceTaskToToday}
                onRevertForceTask={handleRevertForcedTask}
                isExecutionMode={isLocked}
                calendarNotes={projectData.calendar_notes}
                taskNotes={projectData.task_notes}
                onDateClick={(d) => setDateNoteModal({isOpen: true, date: d})}
                onTaskClick={(t) => setTaskNoteModal({isOpen: true, task: t})}
            />

            {/* Visuals Row */}
            <div className="w-full">
                <ImageGenerator 
                    initialPrompt={projectData.smart_goal}
                    usageCount={projectData.image_generation_count || 0}
                    onUsageIncrement={handleImageUsageIncrement}
                />
            </div>

            {/* Floating Bots */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
                <LiveAudioBot 
                    projectPlan={projectData}
                    processedTasks={processedTasks}
                    onTaskToggle={handleTaskToggle}
                />
                <ChatBot 
                    projectPlan={projectData}
                    processedTasks={processedTasks}
                />
            </div>

            {/* Modals */}
            {isAuthModalOpen && (
                <AuthScreen 
                    onClose={() => setIsAuthModalOpen(false)}
                    isModal={true}
                />
            )}

            <JsonEditor 
                initialData={projectData}
                onUpdate={setProjectData}
                isOpen={isJsonEditorOpen}
                setIsOpen={setIsJsonEditorOpen}
            />
            
            <CloudSyncModal 
                isOpen={isCloudModalOpen}
                onClose={() => setIsCloudModalOpen(false)}
                projectData={projectData}
                onLoadProject={(data) => {
                    setProjectData(data);
                    setFeedback({
                        isOpen: true,
                        title: "Project Loaded",
                        message: "Successfully loaded project from cloud.",
                        type: "success"
                    });
                }}
            />

            <DateNoteModal 
                isOpen={dateNoteModal.isOpen}
                onClose={() => setDateNoteModal({isOpen: false, date: null})}
                date={dateNoteModal.date}
                existingNotes={projectData.calendar_notes?.filter(n => dateNoteModal.date && n.date === getInputValue(dateNoteModal.date)) || []}
                onSave={handleSaveCalendarNote}
            />

            <TaskNoteModal 
                isOpen={taskNoteModal.isOpen}
                onClose={() => setTaskNoteModal({isOpen: false, task: null})}
                task={taskNoteModal.task}
                existingNotes={projectData.task_notes?.filter(n => taskNoteModal.task && n.taskId === taskNoteModal.task.id) || []}
                onSave={handleSaveTaskNote}
            />

            <FeedbackModal 
                isOpen={feedback.isOpen}
                onClose={() => setFeedback(prev => ({...prev, isOpen: false}))}
                title={feedback.title}
                message={feedback.message}
                type={feedback.type}
            />

        </div>
    </div>
  );
}