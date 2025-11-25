import React, { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import ArtBoard from './components/ArtBoard';
import { ArtSettings, ShapeMask } from './types';
import { DEFAULT_NAMES_LIST, PRESET_SHAPES } from './constants';

const App: React.FC = () => {
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES_LIST.split('\n').filter(n => n.trim() !== ''));
  
  // State to hold all available shapes (presets + custom)
  const [availableShapes, setAvailableShapes] = useState<ShapeMask[]>(PRESET_SHAPES);
  const [currentShape, setCurrentShape] = useState<ShapeMask>(PRESET_SHAPES[0]);
  
  const [settings, setSettings] = useState<ArtSettings>({
    fontSizeMin: 6,
    fontSizeMax: 40,
    spacing: -1,
    rotation: 'mixed',
    fontFamily: 'Roboto Mono',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    backgroundMode: 'solid',
    backgroundImage: '',
    iterations: 3000
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [triggerGen, setTriggerGen] = useState(0);
  
  // Ref-like callback storage
  const downloadRef = React.useRef<() => void>(() => {});
  const downloadSvgRef = React.useRef<() => void>(() => {});

  const handleGenerate = () => {
    setTriggerGen(prev => prev + 1);
  };

  const handleAddShape = (newShape: ShapeMask) => {
    setAvailableShapes(prev => [...prev, newShape]);
    setCurrentShape(newShape);
  };

  const handleRemoveShape = (id: string) => {
    // Check if valid to remove
    const shapeToRemove = availableShapes.find(s => s.id === id);
    if (!shapeToRemove || shapeToRemove.type === 'preset') return;

    // Create new list
    const newList = availableShapes.filter(s => s.id !== id);
    setAvailableShapes(newList);

    // If we removed the currently selected shape, switch back to the first available (preset)
    if (currentShape.id === id) {
      const fallback = newList.length > 0 ? newList[0] : PRESET_SHAPES[0];
      setCurrentShape(fallback);
    }
  };

  const setDownloadTrigger = useCallback((cb: () => void) => {
    downloadRef.current = cb;
  }, []);

  const setDownloadSvgTrigger = useCallback((cb: () => void) => {
    downloadSvgRef.current = cb;
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100">
      <ControlPanel 
        settings={settings}
        setSettings={setSettings}
        names={names}
        setNames={setNames}
        currentShape={currentShape}
        setCurrentShape={setCurrentShape}
        availableShapes={availableShapes}
        onAddShape={handleAddShape}
        onRemoveShape={handleRemoveShape}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onDownload={() => downloadRef.current()}
        onDownloadSvg={() => downloadSvgRef.current()}
      />
      <ArtBoard 
        settings={settings}
        names={names}
        shape={currentShape}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        triggerGeneration={triggerGen}
        setDownloadTrigger={setDownloadTrigger}
        setDownloadSvgTrigger={setDownloadSvgTrigger}
      />
    </div>
  );
};

export default App;