
import React, { useState, useCallback, useEffect } from 'react';
import { 
  PlusIcon, 
  FolderIcon, 
  LayoutIcon, 
  TrashIcon, 
  ZapIcon,
  ImageIcon,
  Settings2Icon,
  FileJsonIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  CheckCircleIcon,
  CloudUploadIcon,
  HardDriveIcon,
  FileTextIcon,
  FileImageIcon,
  TableIcon,
  FolderPlusIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, Screenshot, UIComponent, UIComponentType } from './types';
import { detectUIComponents } from './services/geminiService';
import Sidebar from './components/Sidebar';
import ImageViewer from './components/ImageViewer';

const STORAGE_KEY = 'ui_mapper_projects_v2';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error al cargar proyectos guardados", e);
      }
    }
    return [{
      id: 'default',
      name: 'Mi Primer Proyecto',
      screenshots: [],
      createdAt: Date.now()
    }];
  });

  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id || 'default');
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreenshot = activeProject?.screenshots.find(s => s.id === activeScreenshotId);

  useEffect(() => {
    if (activeProject && activeProject.screenshots.length > 0 && !activeScreenshotId) {
      setActiveScreenshotId(activeProject.screenshots[0].id);
    }
  }, [activeProjectId]);

  const saveProjectsToDisk = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setSaveStatus('success');
      setShowSaveSuccess("Cambios guardados en el navegador");
      setTimeout(() => {
        setSaveStatus('idle');
        setShowSaveSuccess(null);
      }, 3000);
    } catch (e) {
      alert("Error: No hay espacio suficiente en el almacenamiento local.");
    }
  }, [projects]);

  const createNewProject = () => {
    const name = prompt("Nombre del nuevo proyecto:", `Proyecto ${projects.length + 1}`);
    if (!name) return;
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      screenshots: [],
      createdAt: Date.now()
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveScreenshotId(null);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    if ('files' in e.target && e.target.files) {
      files = e.target.files;
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      files = e.dataTransfer.files;
      e.preventDefault();
    }
    
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newScreenshot: Screenshot = {
            id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            dataUrl,
            width: img.width,
            height: img.height,
            components: [],
            analyzed: false
          };

          setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
              return { ...p, screenshots: [...p.screenshots, newScreenshot] };
            }
            return p;
          }));

          setActiveScreenshotId(newScreenshot.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }, [activeProjectId]);

  const runAnalysis = async () => {
    if (!activeScreenshot || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const components = await detectUIComponents(activeScreenshot.dataUrl);
      setProjects(prev => prev.map(p => ({
        ...p,
        screenshots: p.screenshots.map(s => s.id === activeScreenshotId ? { ...s, components, analyzed: true } : s)
      })));
    } catch (error) {
      alert("Error en el análisis de IA. Verifique su conexión.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRename = (componentId: string, newLabel: string) => {
    setProjects(prev => prev.map(p => ({
      ...p,
      screenshots: p.screenshots.map(s => s.id === activeScreenshotId ? {
        ...s, components: s.components.map(c => c.id === componentId ? { ...c, label: newLabel } : c)
      } : s)
    })));
  };

  const drawSchematicToCanvas = (img: HTMLImageElement, screenshot: Screenshot): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const typeColors: Record<string, string> = {
      'Header': '#3b82f6', 'Navigation': '#8b5cf6', 'Button': '#10b981',
      'Icon': '#f59e0b', 'Input': '#ec4899', 'Form': '#6366f1',
      'Card': '#64748b', 'Modal': '#ef4444', 'Footer': '#1e293b',
      'TextBlock': '#9ca3af', 'Image': '#22c55e', 'Other': '#64748b'
    };

    screenshot.components.forEach(comp => {
      const { ymin, xmin, ymax, xmax } = comp.box_2d;
      const top = (ymin / 1000) * canvas.height;
      const left = (xmin / 1000) * canvas.width;
      const height = ((ymax - ymin) / 1000) * canvas.height;
      const width = ((xmax - xmin) / 1000) * canvas.width;
      const color = typeColors[comp.type] || '#64748b';

      ctx.fillStyle = 'white';
      ctx.fillRect(left, top, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, width, height);

      ctx.fillStyle = color;
      const fontSize = Math.max(14, Math.floor(canvas.width / 70));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const padding = fontSize * 0.8;
      const textWidth = ctx.measureText(comp.label).width;
      ctx.fillRect(left, top - (fontSize + padding), textWidth + padding * 2, fontSize + padding);
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.label, left + padding, top - (fontSize + padding) / 2);
    });

    return canvas;
  };

  const exportAsImage = async (format: 'png' | 'jpeg') => {
    if (!activeScreenshot || !isMappingMode) return alert("Active el Modo Component Map primero.");
    const name = prompt(`Nombre del archivo ${format.toUpperCase()}:`, activeScreenshot.name.split('.')[0] + "_map");
    if (!name) return;

    const img = new Image();
    img.onload = () => {
      const canvas = drawSchematicToCanvas(img, activeScreenshot);
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      link.href = canvas.toDataURL(`image/${format}`, 0.9);
      link.click();
      setShowSaveSuccess(`Imagen guardada: ${link.download}`);
      setTimeout(() => setShowSaveSuccess(null), 4000);
    };
    img.src = activeScreenshot.dataUrl;
  };

  const exportAsPDF = async () => {
    if (!activeScreenshot || !isMappingMode) return alert("Active el Modo Component Map primero.");
    const name = prompt("Nombre del archivo PDF:", activeScreenshot.name.split('.')[0] + "_map");
    if (!name) return;

    const img = new Image();
    img.onload = () => {
      const canvas = drawSchematicToCanvas(img, activeScreenshot);
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const orientation = canvas.width > canvas.height ? 'l' : 'p';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${name}.pdf`);
      setShowSaveSuccess(`PDF descargado: ${name}.pdf`);
      setTimeout(() => setShowSaveSuccess(null), 4000);
    };
    img.src = activeScreenshot.dataUrl;
  };

  const exportAsCSV = () => {
    if (!activeScreenshot) return;
    const headers = "Label,Type,X,Y,Width,Height\n";
    const rows = activeScreenshot.components.map(c => {
      const w = c.box_2d.xmax - c.box_2d.xmin;
      const h = c.box_2d.ymax - c.box_2d.ymin;
      return `"${c.label}","${c.type}",${c.box_2d.xmin},${c.box_2d.ymin},${w},${h}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScreenshot.name.split('.')[0]}_ui_map.csv`;
    a.click();
    setShowSaveSuccess(`CSV descargado: ${a.download}`);
    setTimeout(() => setShowSaveSuccess(null), 4000);
  };

  // Fixed Error: Added missing exportJSON function to export component metadata as a JSON file.
  const exportJSON = () => {
    if (!activeScreenshot) return;
    const jsonString = JSON.stringify(activeScreenshot.components, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScreenshot.name.split('.')[0]}_ui_map.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveSuccess(`JSON descargado: ${a.download}`);
    setTimeout(() => setShowSaveSuccess(null), 4000);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden">
      {showSaveSuccess && (
        <div className="fixed top-20 right-8 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
          <CheckCircleIcon size={20} />
          <span className="text-sm font-bold">{showSaveSuccess}</span>
        </div>
      )}

      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 font-bold text-indigo-600">
            <LayoutIcon size={24} />
            <span className="tracking-tight">UI Mapper AI</span>
          </div>
          <button onClick={saveProjectsToDisk} title="Guardar cambios" className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200 transition-all">
            <HardDriveIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          <section>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyectos</h3>
              <button onClick={createNewProject} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded">
                <FolderPlusIcon size={14} />
              </button>
            </div>
            <select 
              value={activeProjectId} 
              onChange={(e) => { setActiveProjectId(e.target.value); setActiveScreenshotId(null); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-100 outline-none mb-4"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </section>

          <section>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capturas</h3>
              <span className="text-[10px] text-slate-400 font-bold">{activeProject?.screenshots.length || 0}</span>
            </div>
            <div className="space-y-1">
              {activeProject?.screenshots.map(s => (
                <div 
                  key={s.id}
                  onClick={() => setActiveScreenshotId(s.id)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all border ${
                    activeScreenshotId === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded border border-white/20 overflow-hidden shrink-0">
                    <img src={s.dataUrl} className="w-full h-full object-cover" />
                  </div>
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <label className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-indigo-600 py-2.5 rounded-xl border border-indigo-100 font-semibold cursor-pointer transition-all active:scale-95 transform shadow-sm">
            <PlusIcon size={18} />
            <span>Nueva Captura</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </aside>

      <main 
        className="flex-1 relative flex flex-col bg-slate-100 overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileUpload}
      >
        {activeScreenshot ? (
          <>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ImageIcon size={18}/></div>
                <h2 className="font-bold text-slate-800 truncate max-w-[250px]">{activeScreenshot.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMappingMode(!isMappingMode)}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold border ${
                    isMappingMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isMappingMode ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                  <span>Modo Mapa</span>
                </button>

                {!activeScreenshot.analyzed ? (
                  <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                  >
                    <ZapIcon size={18} className={isAnalyzing ? 'animate-spin' : ''} />
                    {isAnalyzing ? 'Analizando...' : 'Detectar UI'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button onClick={() => exportAsImage('png')} title="PNG" className={`p-2 rounded-xl transition-all ${isMappingMode ? 'hover:bg-white text-indigo-600' : 'opacity-30 cursor-not-allowed'}`}><FileImageIcon size={18}/></button>
                    <button onClick={() => exportAsImage('jpeg')} title="JPG" className={`p-2 rounded-xl transition-all ${isMappingMode ? 'hover:bg-white text-blue-600' : 'opacity-30 cursor-not-allowed'}`}><SaveIcon size={18}/></button>
                    <button onClick={exportAsPDF} title="PDF" className={`p-2 rounded-xl transition-all ${isMappingMode ? 'hover:bg-white text-red-600' : 'opacity-30 cursor-not-allowed'}`}><FileTextIcon size={18}/></button>
                    <button onClick={exportAsCSV} title="CSV" className="p-2 hover:bg-white text-emerald-600 rounded-xl transition-all"><TableIcon size={18}/></button>
                    <button onClick={exportJSON} title="JSON" className="p-2 hover:bg-white text-amber-600 rounded-xl transition-all"><FileJsonIcon size={18}/></button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              <ImageViewer 
                screenshot={activeScreenshot}
                hoveredComponentId={hoveredComponentId}
                selectedComponentId={selectedComponentId}
                isMappingMode={isMappingMode}
                onComponentHover={setHoveredComponentId}
                onComponentSelect={setSelectedComponentId}
                onRename={handleRename}
              />
              <Sidebar 
                components={activeScreenshot.components}
                hoveredComponentId={hoveredComponentId}
                selectedComponentId={selectedComponentId}
                onComponentHover={setHoveredComponentId}
                onComponentSelect={setSelectedComponentId}
                onClearComponents={() => {
                  if (confirm("¿Borrar todos los componentes?")) {
                    setProjects(prev => prev.map(p => ({
                      ...p, screenshots: p.screenshots.map(s => s.id === activeScreenshotId ? { ...s, components: [], analyzed: false } : s)
                    })));
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center text-indigo-500 mb-8 border border-indigo-50 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <CloudUploadIcon size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Carga tu Interfaz</h2>
            <p className="text-slate-500 max-w-sm mb-10 leading-relaxed font-medium">
              Suelte sus capturas de pantalla aquí o use el botón lateral para comenzar el análisis automático de componentes.
            </p>
            <div className="flex flex-col items-center gap-4">
              <label className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-bold cursor-pointer shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95 transform">
                <PlusIcon size={20} />
                <span>Subir Imágenes</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <div className="flex items-center gap-3 text-slate-400">
                <div className="h-px w-8 bg-slate-200"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">O Arrastra y Suelta</span>
                <div className="h-px w-8 bg-slate-200"></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
