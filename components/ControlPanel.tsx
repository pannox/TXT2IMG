import React, { useState, useRef } from 'react';
import { ArtSettings, ShapeMask } from '../types';
import { Settings, Type, Image as ImageIcon, Sparkles, RefreshCcw, Download, Upload, X, FileCode, Palette, ImagePlus } from 'lucide-react';
import { generateShapeMask } from '../services/geminiService';

interface Props {
  settings: ArtSettings;
  setSettings: (s: ArtSettings) => void;
  names: string[];
  setNames: (n: string[]) => void;
  currentShape: ShapeMask;
  setCurrentShape: (s: ShapeMask) => void;
  availableShapes: ShapeMask[];
  onAddShape: (s: ShapeMask) => void;
  onRemoveShape: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onDownload: () => void;
  onDownloadSvg: () => void;
}

const ControlPanel: React.FC<Props> = ({
  settings,
  setSettings,
  names,
  setNames,
  currentShape,
  setCurrentShape,
  availableShapes,
  onAddShape,
  onRemoveShape,
  onGenerate,
  isGenerating,
  onDownload,
  onDownloadSvg
}) => {
  const [activeTab, setActiveTab] = useState<'shape' | 'text' | 'style'>('shape');
  const [prompt, setPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleAiShape = async () => {
    if (!prompt) return;
    setIsAiLoading(true);
    try {
      const url = await generateShapeMask(prompt);
      const newShape: ShapeMask = {
        id: `gen-${Date.now()}`,
        name: prompt,
        type: 'generated',
        url: url
      };
      onAddShape(newShape);
      setPrompt(''); // Clear prompt after success
    } catch (e) {
      alert("Impossibile generare la forma. Controlla la chiave API.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const newShape: ShapeMask = {
          id: `upload-${Date.now()}`,
          name: file.name.split('.')[0].substring(0, 12) || 'Caricata',
          type: 'upload',
          url: event.target.result as string
        };
        onAddShape(newShape);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettings({ ...settings, backgroundImage: event.target.result as string, backgroundMode: 'image' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateSetting = (key: keyof ArtSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const rotationLabels: Record<string, string> = {
    random: 'Casuale',
    horizontal: 'Orizz.',
    vertical: 'Vert.',
    mixed: 'Mista'
  };

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 h-screen flex flex-col shadow-xl z-10">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">TextShape<span className="text-indigo-600">.Art</span></h1>
        <p className="text-xs text-gray-500 mt-1">Generatore Tipografico ad Alta Risoluzione</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('shape')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'shape' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ImageIcon className="w-4 h-4 mx-auto mb-1" />
          Forma
        </button>
        <button 
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Type className="w-4 h-4 mx-auto mb-1" />
          Testo
        </button>
        <button 
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'style' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Settings className="w-4 h-4 mx-auto mb-1" />
          Stile
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* SHAPE TAB */}
        {activeTab === 'shape' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Libreria Forme</label>
              <div className="grid grid-cols-3 gap-2">
                {availableShapes.map(shape => (
                  <div key={shape.id} className="relative group">
                    <button
                      onClick={() => setCurrentShape(shape)}
                      className={`w-full p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center h-20 ${currentShape.id === shape.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <img src={shape.url} alt={shape.name} className="w-8 h-8 opacity-80 object-contain" />
                      <span className="text-[10px] mt-2 font-medium text-gray-600 truncate w-full text-center">{shape.name}</span>
                    </button>
                    
                    {shape.type !== 'preset' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm('Vuoi eliminare questa forma?')) {
                            onRemoveShape(shape.id);
                          }
                        }}
                        className="absolute top-1 right-1 z-10 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-600 hover:border-red-600 hover:bg-red-50 shadow-sm transition-all transform hover:scale-110"
                        title="Rimuovi forma"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Carica Nuova
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm font-medium flex items-center justify-center bg-gray-50"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Scegli File Immagine...
              </button>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Usa silhouette nere su sfondo bianco per risultati migliori.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
              <label className="block text-sm font-semibold text-indigo-900 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                Generatore Forme IA
              </label>
              <textarea 
                className="w-full text-sm p-3 rounded-lg border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[80px]"
                placeholder="es. Una silhouette di una chitarra, un cavallo che corre..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                onClick={handleAiShape}
                disabled={isAiLoading || !prompt}
                className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isAiLoading ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : "Genera e Aggiungi"}
              </button>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Lista Nomi</label>
               <p className="text-xs text-gray-500 mb-2">Un nome per riga. Usato per riempire la forma.</p>
               <textarea 
                  className="w-full h-64 text-xs font-mono p-3 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                  value={names.join('\n')}
                  onChange={(e) => setNames(e.target.value.split('\n'))}
               />
               <div className="mt-2 text-right text-xs text-gray-400">
                 {names.length} elementi
               </div>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Famiglia Font</label>
              <select 
                value={settings.fontFamily}
                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white"
              >
                <option value="Inter">Inter (Sans-Serif)</option>
                <option value="Playfair Display">Playfair (Serif)</option>
                <option value="Roboto Mono">Roboto Mono (Monospace)</option>
                <option value="Arial">Arial</option>
              </select>
            </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Sfondo</label>
               <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  <button
                    onClick={() => updateSetting('backgroundMode', 'solid')}
                    className={`flex-1 text-xs py-2 rounded-md transition-all flex items-center justify-center ${settings.backgroundMode === 'solid' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Palette className="w-3 h-3 mr-1" /> Colore
                  </button>
                  <button
                    onClick={() => updateSetting('backgroundMode', 'image')}
                    className={`flex-1 text-xs py-2 rounded-md transition-all flex items-center justify-center ${settings.backgroundMode === 'image' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <ImagePlus className="w-3 h-3 mr-1" /> Immagine
                  </button>
               </div>

               {settings.backgroundMode === 'solid' ? (
                 <div className="flex gap-2">
                   <input 
                     type="color" 
                     value={settings.backgroundColor}
                     onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                     className="h-8 w-8 rounded cursor-pointer border-0 p-0 shadow-sm"
                   />
                   <span className="text-sm self-center text-gray-500">{settings.backgroundColor}</span>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <input 
                     type="file" 
                     ref={bgInputRef}
                     onChange={handleBgUpload}
                     accept="image/*"
                     className="hidden"
                   />
                   <button
                    onClick={() => bgInputRef.current?.click()}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-md text-xs text-gray-500 hover:bg-gray-50"
                   >
                     {settings.backgroundImage ? 'Cambia Immagine' : 'Carica Immagine Sfondo'}
                   </button>
                   
                   {settings.backgroundImage && (
                     <div className="relative h-24 w-full rounded border border-gray-200 overflow-hidden bg-gray-50">
                       <img src={settings.backgroundImage} className="w-full h-full object-cover" />
                       <button 
                         onClick={() => updateSetting('backgroundImage', '')}
                         className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 hover:bg-white"
                         title="Rimuovi"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   )}
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dimensione Min</label>
                <input 
                  type="number" 
                  value={settings.fontSizeMin}
                  onChange={(e) => updateSetting('fontSizeMin', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 p-2 text-sm"
                  min="4"
                />
               </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dimensione Max</label>
                <input 
                  type="number" 
                  value={settings.fontSizeMax}
                  onChange={(e) => updateSetting('fontSizeMax', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 p-2 text-sm"
                  max="200"
                />
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Densità (Parole Totali)</label>
              <input 
                type="range" 
                min="500" max="6000" step="100"
                value={settings.iterations}
                onChange={(e) => updateSetting('iterations', Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Veloce (Rada)</span>
                <span>Alta Qualità (Densa)</span>
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Spaziatura (Padding)</label>
               <input 
                 type="number" 
                 value={settings.spacing}
                 onChange={(e) => updateSetting('spacing', Number(e.target.value))}
                 className="w-full rounded-md border-gray-300 p-2 text-sm"
                 min="-5"
                 max="10"
               />
               <p className="text-[10px] text-gray-400 mt-1">Usa valori negativi per testo più compatto.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rotazione</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['random', 'horizontal', 'vertical', 'mixed'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateSetting('rotation', opt)}
                    className={`flex-1 text-xs py-2 rounded-md capitalize transition-all ${settings.rotation === opt ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {rotationLabels[opt]}
                  </button>
                ))}
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Colore Testo</label>
               <div className="flex gap-2">
                 <input 
                   type="color" 
                   value={settings.textColor}
                   onChange={(e) => updateSetting('textColor', e.target.value)}
                   className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                 />
                 <span className="text-sm self-center text-gray-500">{settings.textColor}</span>
               </div>
            </div>
          </div>
        )}

      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
        <button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-3 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-black transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> Elaborazione...
            </>
          ) : (
             "Renderizza Opera"
          )}
        </button>
        <div className="flex gap-2">
          <button 
            onClick={onDownload}
            className="flex-1 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" /> PNG (Raster)
          </button>
           <button 
            onClick={onDownloadSvg}
            className="flex-1 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center"
            title="Scarica file vettoriale (SVG)"
          >
            <FileCode className="w-4 h-4 mr-2" /> SVG (Vector)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;