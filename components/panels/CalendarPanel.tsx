import React, { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO format string or YYYY-MM-DD
  desc: string;
  category: 'System' | 'Ritual' | 'Operational' | 'Personal';
  time: string;
  color: string;
}

const DEFAULT_EVENTS: CalendarEvent[] = [
  { id: 'ev-1', title: 'System Lattice Compaction', date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString().split('T')[0], desc: 'Automated disk and DB backup cycle.', category: 'System', time: '02:00 AM', color: 'bg-amber-500' },
  { id: 'ev-2', title: 'Cosmic Synergic Alignment', date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3).toISOString().split('T')[0], desc: 'Inter-dimensional frequency stabilization ritual.', category: 'Ritual', time: '12:00 PM', color: 'bg-indigo-500' },
  { id: 'ev-3', title: 'Operations Profit-Outflow Report', date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1).toISOString().split('T')[0], desc: 'Review quarterly autonomous revenue distribution.', category: 'Operational', time: '04:30 PM', color: 'bg-emerald-500' }
];

const CATEGORY_TAGS = [
  { name: 'System', color: 'bg-amber-500 text-white', ring: 'ring-amber-500/30' },
  { name: 'Ritual', color: 'bg-indigo-500 text-white', ring: 'ring-indigo-500/30' },
  { name: 'Operational', color: 'bg-emerald-500 text-white', ring: 'ring-emerald-500/30' },
  { name: 'Personal', color: 'bg-fuchsia-500 text-white', ring: 'ring-fuchsia-500/30' }
];

const CalendarPanel: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // Event Adding Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'System' | 'Ritual' | 'Operational' | 'Personal'>('Personal');
  const [newTime, setNewTime] = useState('12:00 PM');

  // Load and merge events from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('nvk_calendar_events_v2');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        setEvents(DEFAULT_EVENTS);
      }
    } else {
      setEvents(DEFAULT_EVENTS);
      localStorage.setItem('nvk_calendar_events_v2', JSON.stringify(DEFAULT_EVENTS));
    }
  }, []);

  const saveEvents = (updatedList: CalendarEvent[]) => {
    setEvents(updatedList);
    localStorage.setItem('nvk_calendar_events_v2', JSON.stringify(updatedList));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || selectedDay === null) return;

    const formattedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    
    const catBg = CATEGORY_TAGS.find(c => c.name === newCategory)?.color.split(' ')[0] || 'bg-cyan-500';

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: newTitle.trim(),
      date: formattedDateStr,
      desc: newDesc.trim() || 'No additional specifications.',
      category: newCategory,
      time: newTime,
      color: catBg
    };

    const nextEvents = [...events, newEvent];
    saveEvents(nextEvents);
    
    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewCategory('Personal');
    setNewTime('12:00 PM');
    setShowAddForm(false);
  };

  const handleDeleteEvent = (id: string) => {
    const nextEvents = events.filter(e => e.id !== id);
    saveEvents(nextEvents);
  };

  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
    setShowAddForm(true);
  };

  const handleExportEvents = () => {
    const list = events.sort((a,b) => a.date.localeCompare(b.date));
    let content = `==================================================\n`;
    content += `         NVK DIGITAL CALENDAR ARCHIVE REPORT      \n`;
    content += `==================================================\n\n`;
    
    list.forEach((evt, i) => {
      content += `[${i + 1}] DATE: ${evt.date} @ ${evt.time}\n`;
      content += `    TITLE: ${evt.title}\n`;
      content += `    CATEGORY: ${evt.category.toUpperCase()}\n`;
      content += `    DESC: ${evt.desc}\n`;
      content += `--------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nvk_calendar_export.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDays = () => {
    const days = [];
    const today = new Date();
    
    // Empty prefix padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-1.5 sm:p-2 bg-transparent"></div>);
    }

    // Days grid
    for (let i = 1; i <= daysInMonth; i++) {
      const matchDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      
      const dayEvents = events.filter(e => e.date === matchDateStr);
      
      const isToday = today.getDate() === i && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
      
      const isSelected = selectedDay === i;

      days.push(
        <div 
          key={i} 
          onClick={() => handleDaySelect(i)}
          className={`p-1.5 sm:p-2 rounded-lg border min-h-[46px] sm:min-h-[64px] flex flex-col justify-between transition-all cursor-pointer ${
            isToday 
              ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-950/20' 
              : isSelected 
                ? 'bg-slate-800 border-slate-500' 
                : 'bg-slate-900/40 border-slate-900/60 hover:bg-slate-900 hover:border-slate-850'
          }`}
        >
          <div className="flex justify-between items-baseline mb-1">
            <span className={`text-[10px] sm:text-xs font-mono font-bold ${isToday ? 'text-cyan-400' : 'text-slate-400 font-medium'}`}>
              {i}
            </span>
            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse truncate" title="Today"></span>}
          </div>
          
          {/* Dots/Mini Event Bars on Calendar Grid */}
          <div className="flex flex-col gap-0.5 mt-auto max-h-[16px] sm:max-h-[30px] overflow-hidden">
            {dayEvents.map((evt) => (
              <div 
                key={evt.id} 
                className={`${evt.color} rounded-sm px-1 py-[1.5px] text-[6px] sm:text-[7.5px] truncate text-white leading-tight font-mono`}
                title={`${evt.title} (${evt.time})`}
              >
                {evt.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const getEventsForDay = () => {
    if (selectedDay === null) return [];
    const formattedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    return events.filter(e => e.date === formattedDateStr);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-4 sm:p-5 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <i className="ri-calendar-event-line text-cyan-400 text-xl sm:text-2xl"></i>
          <h2 className="text-lg sm:text-xl font-light text-white tracking-wide">
            {currentDate.toLocaleString('default', { month: 'long' })} <span className="text-slate-500 font-mono font-bold">{currentDate.getFullYear()}</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportEvents}
            className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded text-[9px] font-mono tracking-widest text-slate-400 hover:text-white transition-all uppercase"
          >
            Export Archive
          </button>
          
          <div className="w-px h-5 bg-slate-850"></div>

          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <i className="ri-arrow-left-s-line text-lg"></i>
          </button>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <i className="ri-arrow-right-s-line text-lg"></i>
          </button>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        
        {/* Days grid view */}
        <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar pr-0.5 md:w-3/4">
          <div className="grid grid-cols-7 gap-1.5 mb-1 bg-slate-950 sticky top-0 py-1 border-b border-white/5">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center text-[8.5px] font-mono font-bold text-slate-500 tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1.5 flex-grow min-h-0">
            {renderDays()}
          </div>
        </div>

        {/* Interactive Events Manager Panel */}
        <div className="w-full md:w-1/4 shrink-0 bg-slate-900/20 border border-white/5 rounded-xl p-3 flex flex-col h-full overflow-hidden max-h-48 md:max-h-none">
          
          {selectedDay !== null ? (
            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="flex justify-between items-baseline mb-2 border-b border-white/5 pb-1.5">
                <span className="text-[10px] font-mono font-bold text-cyan-400">
                  REF_DAY: {currentDate.toLocaleString('default', { month: 'short' })} {selectedDay}
                </span>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="text-[9px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  CLEAR
                </button>
              </div>

              {/* Event Creation Form */}
              {showAddForm ? (
                <form onSubmit={handleAddEvent} className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1 h-36">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Title e.g. System Audit" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="w-full bg-slate-950 text-xs px-2 py-1 border border-slate-800 rounded text-white outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Description" 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-slate-950 text-[10px] px-2 py-1 border border-slate-800 rounded text-slate-300 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <select 
                      value={newCategory} 
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="bg-slate-950 text-[9px] px-1 py-1 border border-slate-800 rounded outline-none text-slate-300"
                    >
                      <option value="Personal">Personal</option>
                      <option value="System">System</option>
                      <option value="Ritual">Ritual</option>
                      <option value="Operational">Operational</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="12:00 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="bg-slate-950 text-[9px] px-1 py-1 border border-slate-800 rounded text-center outline-none text-white focus:border-cyan-500/30"
                    />
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button type="submit" className="flex-grow py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] uppercase font-mono tracking-widest font-bold">
                      Add Event
                    </button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="py-1 px-2.5 bg-slate-850 hover:bg-slate-800 rounded text-[9px] font-mono text-slate-500 hover:text-slate-300">
                      View
                    </button>
                  </div>
                </form>
              ) : (
                /* Selected Day's Event List */
                <div className="flex-grow flex flex-col justify-between overflow-hidden">
                  <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {getEventsForDay().length === 0 ? (
                      <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-1">
                        <i className="ri-folder-add-line text-lg opacity-40"></i>
                        <span className="text-[9px] uppercase tracking-widest">No Events Scheduled</span>
                        <button 
                          onClick={() => setShowAddForm(true)}
                          className="mt-2 text-[8px] bg-cyan-950 border border-cyan-800 text-cyan-400 hover:bg-cyan-900 px-2 py-0.5 rounded cursor-pointer font-bold"
                        >
                          BUILD ONE
                        </button>
                      </div>
                    ) : (
                      getEventsForDay().map((evt) => (
                        <div key={evt.id} className="p-2 bg-slate-900/60 rounded border border-white/5 relative group hover:border-slate-800 transition-all select-all">
                          <button 
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="absolute top-1.5 right-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-xs cursor-pointer"
                            title="Delete Event"
                          >
                            <i className="ri-close-fill"></i>
                          </button>
                          <div className="text-white text-xs font-semibold leading-tight pr-4">{evt.title}</div>
                          <div className="text-[9px] text-cyan-400 mt-1 font-mono">{evt.time}</div>
                          <p className="text-[9.5px] text-slate-400 mt-0.5 leading-normal">{evt.desc}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="w-full mt-2 py-1 border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-[9px] text-slate-500 hover:text-cyan-400 font-mono rounded font-bold uppercase cursor-pointer"
                  >
                    + Add New Event
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* General overview of all events inside month */
            <div className="flex-grow flex flex-col overflow-hidden">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 border-b border-white/5 pb-1.5 mb-2 font-bold uppercase">
                All Scheduled Items ({events.length})
              </span>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {events.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs">No active schedules found.</div>
                ) : (
                  [...events].sort((a,b) => a.date.localeCompare(b.date)).map((evt) => (
                    <div 
                      key={evt.id} 
                      onClick={() => {
                        const evtDay = parseInt(evt.date.split('-')[2]);
                        setSelectedDay(evtDay);
                      }}
                      className="p-1 px-2.5 bg-slate-900/40 hover:bg-slate-900/90 rounded border border-white/5 flex flex-col cursor-pointer transition-all hover:border-cyan-500/20"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium text-[10.5px] truncate w-2/3 pr-1">{evt.title}</span>
                        <span className="text-[8px] font-mono text-slate-500 whitespace-nowrap">{evt.date.substring(5)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[8.5px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${evt.color}`}></span>
                        <span className="text-slate-500 font-mono truncate">{evt.category} @ {evt.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
        </div>

      </div>

      {/* Diagnostics code footer */}
      <div className="p-1 border-t border-slate-950 bg-slate-900 text-[8px] font-mono text-slate-600 flex justify-between uppercase mt-2">
        <span>CAL_SYNAPSE_LINK: SECURE_STORAGE_OK</span>
        <span>STABLE_STATE</span>
      </div>
    </div>
  );
};

export default CalendarPanel;
