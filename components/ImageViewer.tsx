
import React, { useState, useRef, useEffect } from 'react';
import { Screenshot, UIComponent, UIComponentType } from '../types';
import { 
  SearchIcon, 
  MousePointer2Icon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  Maximize2Icon,
  CheckIcon,
  Edit2Icon
} from 'lucide-react';

interface ImageViewerProps {
  screenshot: Screenshot;
  hoveredComponentId: string | null;
  selectedComponentId: string | null;
  isMappingMode: boolean;
  onComponentHover: (id: string | null) => void;
  onComponentSelect: (id: string | null) => void;
  onRename: (id: string, newLabel: string) => void;
}

const TYPE_COLORS: Record<UIComponentType, string> = {
  [UIComponentType.HEADER]: 'rgb(59, 130, 246)',
  [UIComponentType.NAVIGATION]: 'rgb(139, 92, 246)',
  [UIComponentType.BUTTON]: 'rgb(16, 185, 129)',
  [UIComponentType.ICON]: 'rgb(245, 158, 11)',
  [UIComponentType.INPUT]: 'rgb(236, 72, 153)',
  [UIComponentType.SELECT]: 'rgb(236, 72, 153)', 
  [UIComponentType.FORM]: 'rgb(99, 102, 241)',
  [UIComponentType.CARD]: 'rgb(107, 114, 128)',
  [UIComponentType.MODAL]: 'rgb(239, 68, 68)',
  [UIComponentType.FOOTER]: 'rgb(30, 41, 59)',
  [UIComponentType.TEXT]: 'rgb(156, 163, 175)',
  [UIComponentType.IMAGE]: 'rgb(34, 197, 94)',
  [UIComponentType.OTHER]: 'rgb(100, 116, 139)'
};

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  screenshot, 
  hoveredComponentId, 
  selectedComponentId,
  isMappingMode,
  onComponentHover,
  onComponentSelect,
  onRename
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState("");
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const ratio = Math.min((cw - 80) / screenshot.width, (ch - 80) / screenshot.height);
      setZoom(Math.min(1, ratio));
      setOffset({ x: 0, y: 0 });
    }
  }, [screenshot.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || editingId) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const startRename = (e: React.MouseEvent, comp: UIComponent) => {
    e.stopPropagation();
    setEditingId(comp.id);
    setTempLabel(comp.label);
  };

  const finishRename = () => {
    if (editingId && tempLabel.trim()) {
      onRename(editingId, tempLabel.trim());
      setShowConfirm(editingId);
      setTimeout(() => setShowConfirm(null), 2000);
    }
    setEditingId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-200 cursor-grab active:cursor-grabbing transition-colors duration-500"
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      style={{ backgroundColor: isMappingMode ? '#cbd5e1' : '#f1f5f9' }}
    >
      <div 
        ref={contentRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          width: screenshot.width, height: screenshot.height,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden rounded-xl border border-white/50"
      >
        <img 
          src={screenshot.dataUrl} 
          draggable={false} 
          className={`w-full h-full block transition-all duration-700 ${isMappingMode ? 'opacity-5 blur-md grayscale' : 'opacity-100 blur-0 grayscale-0'}`} 
        />
        
        {isMappingMode && (
          <div className="absolute inset-0 pointer-events-none opacity-20" 
               style={{ backgroundImage: 'radial-gradient(#6366f1 0.7px, transparent 0.7px)', backgroundSize: '24px 24px' }} />
        )}

        {screenshot.analyzed && screenshot.components.map(comp => {
          const { ymin, xmin, ymax, xmax } = comp.box_2d;
          const top = (ymin / 1000) * screenshot.height;
          const left = (xmin / 1000) * screenshot.width;
          const height = ((ymax - ymin) / 1000) * screenshot.height;
          const width = ((xmax - xmin) / 1000) * screenshot.width;
          
          const isHovered = hoveredComponentId === comp.id;
          const isSelected = selectedComponentId === comp.id;
          const isVisible = isMappingMode || isHovered || isSelected;
          const baseColor = TYPE_COLORS[comp.type] || TYPE_COLORS[UIComponentType.OTHER];

          return (
            <div
              key={comp.id}
              onClick={(e) => { e.stopPropagation(); onComponentSelect(comp.id); }}
              onMouseEnter={() => onComponentHover(comp.id)}
              onMouseLeave={() => onComponentHover(null)}
              className={`absolute transition-all duration-300 pointer-events-auto border-2 ${isSelected ? 'z-50 ring-4 ring-indigo-400 ring-opacity-30' : 'z-10'}`}
              style={{
                top, left, width, height,
                borderColor: baseColor,
                backgroundColor: isMappingMode ? 'rgba(255,255,255,0.98)' : (isVisible ? `${baseColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}` : 'transparent'),
                boxShadow: isMappingMode ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                borderRadius: '4px'
              }}
            >
              {isVisible && (
                <div 
                  className={`absolute -top-8 left-0 text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap font-black shadow-lg flex items-center gap-2 transition-all duration-300 ${editingId === comp.id ? 'z-[60]' : ''}`}
                  style={{ backgroundColor: baseColor, opacity: isVisible ? 1 : 0 }}
                  onClick={(e) => startRename(e, comp)}
                >
                  {editingId === comp.id ? (
                    <input 
                      autoFocus className="bg-white/20 text-white outline-none border-none px-1 rounded w-32 placeholder:text-white/40"
                      value={tempLabel} onChange={(e) => setTempLabel(e.target.value)}
                      onBlur={finishRename} onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      {isMappingMode ? <Edit2Icon size={10} /> : <MousePointer2Icon size={10} />}
                      <span>{comp.label}</span>
                      {showConfirm === comp.id && <CheckIcon size={12} className="text-emerald-300" />}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-white/20">
        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-2.5 hover:bg-white rounded-xl transition-all"><ZoomOutIcon size={18} /></button>
        <span className="text-[11px] font-black text-slate-600 w-14 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="p-2.5 hover:bg-white rounded-xl transition-all"><ZoomInIcon size={18} /></button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <button onClick={() => { setZoom(1); setOffset({x:0,y:0}); }} className="p-2.5 hover:bg-white rounded-xl transition-all"><Maximize2Icon size={18} /></button>
      </div>

      {!screenshot.analyzed && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-indigo-600/10 border-2 border-dashed border-indigo-400/40 text-indigo-700 px-8 py-4 rounded-3xl flex items-center gap-4 animate-pulse">
            <SearchIcon size={24} />
            <span className="text-sm font-black uppercase tracking-widest">Listo para analizar interfaz</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
