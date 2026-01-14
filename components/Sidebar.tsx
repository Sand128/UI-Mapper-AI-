
import React from 'react';
import { UIComponent, UIComponentType } from '../types';
import { 
  ChevronRightIcon, 
  LayersIcon, 
  InfoIcon, 
  LayoutTemplateIcon,
  TagIcon,
  Trash2Icon,
  MaximizeIcon
} from 'lucide-react';

interface SidebarProps {
  components: UIComponent[];
  hoveredComponentId: string | null;
  selectedComponentId: string | null;
  onComponentHover: (id: string | null) => void;
  onComponentSelect: (id: string | null) => void;
  onClearComponents: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  components,
  hoveredComponentId,
  selectedComponentId,
  onComponentHover,
  onComponentSelect,
  onClearComponents
}) => {
  const selectedComponent = components.find(c => c.id === selectedComponentId);

  const grouped = components.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = [];
    acc[curr.type].push(curr);
    return acc;
  }, {} as Record<string, UIComponent[]>);

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-2xl z-20">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayersIcon size={16} className="text-indigo-500" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Mapa de Capas</h3>
        </div>
        {components.length > 0 && (
          <button 
            onClick={onClearComponents}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Borrar todo"
          >
            <Trash2Icon size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {components.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-300">
            <LayoutTemplateIcon size={40} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-wider">Sin componentes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, comps]) => (
              <div key={type} className="space-y-1">
                <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{type}</div>
                {comps.map(comp => (
                  <div
                    key={comp.id}
                    onMouseEnter={() => onComponentHover(comp.id)}
                    onMouseLeave={() => onComponentHover(null)}
                    onClick={() => onComponentSelect(comp.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-sm cursor-pointer transition-all border ${
                      selectedComponentId === comp.id 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                        : hoveredComponentId === comp.id
                          ? 'bg-slate-50 border-slate-200 text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        selectedComponentId === comp.id ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'
                      }`} />
                      <span className="truncate font-semibold text-xs tracking-tight">{comp.label}</span>
                    </div>
                    <ChevronRightIcon size={12} className={`shrink-0 transition-transform ${selectedComponentId === comp.id ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedComponent && (
        <div className="p-5 border-t border-slate-200 bg-white animate-in slide-in-from-bottom-4 duration-300 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalles</h4>
            <button onClick={() => onComponentSelect(null)} className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase tracking-widest">Cerrar</button>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase mb-2">
                <TagIcon size={12} />
                <span>Categoría</span>
              </div>
              <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full inline-block border border-indigo-100">
                {selectedComponent.type}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase mb-2">
                <InfoIcon size={12} />
                <span>Descripción</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 font-medium">
                {selectedComponent.description || 'Sin descripción disponible.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[9px] text-slate-400 font-black uppercase mb-1">Posición</span>
                <span className="text-[10px] font-mono font-bold text-slate-700">{selectedComponent.box_2d.xmin}, {selectedComponent.box_2d.ymin}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[9px] text-slate-400 font-black uppercase mb-1">Tamaño</span>
                <span className="text-[10px] font-mono font-bold text-slate-700">{selectedComponent.box_2d.xmax - selectedComponent.box_2d.xmin}x{selectedComponent.box_2d.ymax - selectedComponent.box_2d.ymin}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
