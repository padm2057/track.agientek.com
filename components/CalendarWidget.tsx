import React, { useState, useEffect } from 'react';

interface CalendarWidgetProps {
  nonWorkingDays: string[];
  onToggleDay: (dateStr: string | string[], forceState?: boolean) => void;
  isReadOnly?: boolean;
  startDate?: Date;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  nonWorkingDays, 
  onToggleDay, 
  isReadOnly = false,
  startDate,
  onMoveUp,
  onMoveDown
}) => {
  // Initialize to current system date to match the Header Clock
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(true);

  // Drag State
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragCurrent, setDragCurrent] = useState<string | null>(null);
  // isBlockingMode now primarily drives the visual preview during drag (always true/blocked for "painting" effect)
  const [isBlockingMode, setIsBlockingMode] = useState(true); 

  // NOTE: We do NOT auto-sync currentMonth to startDate prop changes anymore 
  // to preserve the "Calendar matches Clock" behavior requested.

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const days = getDaysInMonth(currentMonth);
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 = Sun
  
  // Format YYYY-MM-DD
  const toDateKey = (d: Date) => {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // Helper to parse "YYYY-MM-DD" safely to local date for comparison
  const parseDateKey = (str: string) => {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleJumpToToday = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth(new Date());
  }

  // --- DRAG SELECTION LOGIC ---
  
  const getRange = (start: string, end: string) => {
      const s = parseDateKey(start);
      const e = parseDateKey(end);
      const dates: string[] = [];
      
      const low = s < e ? s : e;
      const high = s < e ? e : s;
      
      const current = new Date(low);
      while (current <= high) {
          dates.push(toDateKey(current));
          current.setDate(current.getDate() + 1);
      }
      return dates;
  };

  const isInDragRange = (dateKey: string) => {
      if (!dragStart || !dragCurrent) return false;
      const d = parseDateKey(dateKey);
      const s = parseDateKey(dragStart);
      const e = parseDateKey(dragCurrent);
      const low = s < e ? s : e;
      const high = s < e ? e : s;
      return d >= low && d <= high;
  };

  const handleMouseDown = (dateKey: string, e: React.MouseEvent) => {
      // Prevent default browser drag behavior (ghost image) which blocks mouse events
      e.preventDefault();
      
      const isBlocked = nonWorkingDays.includes(dateKey);

      // LOCK LOGIC: 
      // If Locked (ReadOnly), we CANNOT interact with days that are already blocked.
      // We CAN interact with working days (to block them).
      if (isReadOnly && isBlocked) return;
      
      // Enforce "Painting/Marking" mode visual for drag interactions.
      setIsBlockingMode(true);
      
      setDragStart(dateKey);
      setDragCurrent(dateKey);
  };

  const handleMouseEnter = (dateKey: string) => {
      if (dragStart) {
          setDragCurrent(dateKey);
      }
  };

  const handleMouseUp = () => {
      if (dragStart && dragCurrent) {
          const range = getRange(dragStart, dragCurrent);
          
          let shouldBlock = true;

          // Logic:
          // 1. If it's a single click (Start == Current), we TOGGLE the state.
          //    This allows users to unmark a day if they made a mistake.
          // 2. If it's a drag (Start != Current), we ALWAYS BLOCK (mark as non-working).
          
          if (dragStart === dragCurrent) {
              const isCurrentlyBlocked = nonWorkingDays.includes(dragStart);
              shouldBlock = !isCurrentlyBlocked;
          } else {
              shouldBlock = true;
          }

          // LOCK GUARD:
          // If in ReadOnly mode, we are strictly forbidden from Unblocking (shouldBlock = false).
          // We can only Block.
          if (isReadOnly && !shouldBlock) {
              setDragStart(null);
              setDragCurrent(null);
              return;
          }

          onToggleDay(range, shouldBlock);
      }
      setDragStart(null);
      setDragCurrent(null);
  };

  const handleDayHeaderClick = (dayIndex: number) => {
      // In read-only mode, we allow clicking ONLY to bulk-block the working days.
      // We do not allow bulk-unblocking.

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const targetDates: string[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          if (d.getDay() === dayIndex) {
              targetDates.push(toDateKey(d));
          }
      }

      if (targetDates.length === 0) return;

      if (isReadOnly) {
          // Force Block in read-only mode
          onToggleDay(targetDates, true);
      } else {
          // Always block on header click to enforce "crossing out" behavior
          onToggleDay(targetDates, true);
      }
  };

  // Global mouse up to catch drag releases outside grid
  useEffect(() => {
      const upHandler = () => {
          if (dragStart) handleMouseUp();
      };
      window.addEventListener('mouseup', upHandler);
      return () => window.removeEventListener('mouseup', upHandler);
  }, [dragStart, dragCurrent, isBlockingMode, nonWorkingDays, isReadOnly]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-200 h-auto flex flex-col w-full break-inside-avoid select-none">
      {/* Header */}
      <div 
        className={`px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOpen ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}
      >
        <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex-grow cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Working Calendar
            {isReadOnly && (
               <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">LOCKED</span>
            )}
          </h3>
          {!isOpen && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage non-working days.</p>}
        </div>

        <div className="flex items-center gap-4">
            {/* Reorder Controls */}
            {(onMoveUp || onMoveDown) && (
                <div className="flex flex-col gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} 
                        disabled={!onMoveUp}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500">
                            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                        disabled={!onMoveDown}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-6 animate-fade-in">
            {/* Calendar Month Nav */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 select-none min-w-[120px] text-center">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <button 
                    onClick={handleJumpToToday}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                >
                    Today
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="w-full">
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <div 
                            key={d} 
                            onClick={() => handleDayHeaderClick(i)}
                            className={`text-[10px] font-bold uppercase tracking-wide transition-colors text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer`}
                            title={`Toggle all ${d}s in this month`}
                        >
                            {d}
                        </div>
                    ))}
                </div>
                <div className={`grid grid-cols-7 gap-1.5`}>
                    {/* Empty slots for start of month */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-8" />
                    ))}
                    
                    {/* Days */}
                    {days.map(d => {
                        const dateKey = toDateKey(d);
                        const isBlocked = nonWorkingDays.includes(dateKey);
                        const isToday = toDateKey(new Date()) === dateKey;
                        const isStartDate = startDate && toDateKey(startDate) === dateKey;
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isSelectedInDrag = isInDragRange(dateKey);

                        let visualBlocked = isBlocked;
                        if (isSelectedInDrag) {
                            visualBlocked = isBlockingMode; // Preview the target state
                        }

                        // Interaction Cursor Logic
                        const isInteractive = !isReadOnly || (isReadOnly && !isBlocked);

                        let cellClasses = `
                            relative flex items-center justify-center rounded-md transition-all duration-75
                            aspect-square h-8 sm:h-auto text-xs font-medium group border
                            ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}
                        `;

                        // --- STYLE PRIORITY UPDATED ---
                        // 1. Blocked (Always looks blocked)
                        // 2. Today (Solid Highlighting - Matches Clock)
                        // 3. Start Date (Outlined - Important Marker)
                        
                        if (visualBlocked) {
                            cellClasses += ' bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-400 decoration-rose-400';
                        } else if (isToday) {
                            // PRIMARY HIGHLIGHT: Today matches the clock
                            cellClasses += ' bg-indigo-600 text-white border-indigo-600 shadow-md ring-1 ring-indigo-200 dark:ring-indigo-900';
                        } else if (isStartDate) {
                            // SECONDARY HIGHLIGHT: Start Date (if not today)
                            cellClasses += ' bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-500 font-bold';
                        } else if (isWeekend) {
                            cellClasses += ' bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400';
                        } else {
                            // Standard day
                            cellClasses += ' bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                            if (isInteractive) {
                                cellClasses += ' hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm';
                            }
                        }

                        if (isSelectedInDrag) {
                            cellClasses += ' ring-2 ring-indigo-400 dark:ring-indigo-500 z-10';
                        }

                        const tooltip = isReadOnly 
                            ? (isBlocked ? "Locked: Cannot unmark" : "Mark as Non-Working Day") 
                            : (isBlocked ? "Set as Working Day" : isToday ? "Today" : isStartDate ? "Project Start Date" : "Set as Non-Working Day");

                        return (
                            <div 
                                key={dateKey}
                                onMouseDown={(e) => handleMouseDown(dateKey, e)}
                                onMouseEnter={() => handleMouseEnter(dateKey)}
                                className={cellClasses}
                                title={tooltip}
                            >
                                {d.getDate()}
                                {visualBlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-2/3 h-px bg-rose-400 rotate-45"></div>
                                    </div>
                                )}
                                {isStartDate && !visualBlocked && !isToday && (
                                    <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};