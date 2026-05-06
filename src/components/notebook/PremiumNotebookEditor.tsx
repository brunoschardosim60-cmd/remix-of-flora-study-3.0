import React, { useState, useRef, useEffect } from "react";
import { Pen, Highlighter, Eraser, Type, Image, Mic, MoreVertical, ChevronDown, Save, Download } from "lucide-react";
import "./PremiumNotebookEditor.css";

interface PremiumNotebookEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  paperType?: "blank" | "lined" | "grid" | "dotted";
  subject?: string;
}

export const PremiumNotebookEditor: React.FC<PremiumNotebookEditorProps> = ({
  initialContent = "",
  onSave,
  paperType = "blank",
  subject = "Geral",
}) => {
  const [content, setContent] = useState(initialContent);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<"pen" | "highlighter" | "eraser" | "text">("pen");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(2);
  const [showToolbar, setShowToolbar] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Definir tamanho do canvas
    canvas.width = containerRef.current?.clientWidth || 800;
    canvas.height = containerRef.current?.clientHeight || 1000;

    // Desenhar background com padrão de papel
    drawPaperBackground(ctx, canvas.width, canvas.height, paperType);
  }, [paperType]);

  const drawPaperBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: string
  ) => {
    // Fundo branco/creme
    ctx.fillStyle = type === "blank" ? "#ffffff" : "#fafaf8";
    ctx.fillRect(0, 0, width, height);

    // Desenhar padrões
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;

    if (type === "lined") {
      const lineSpacing = 25;
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
      // Margem esquerda
      ctx.strokeStyle = "#ffcccc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(35, height);
      ctx.stroke();
    } else if (type === "grid") {
      const gridSize = 20;
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (type === "dotted") {
      const dotSpacing = 20;
      ctx.fillStyle = "#e0e0e0";
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = selectedTool === "highlighter" ? "rgba(255, 255, 0, 0.4)" : penColor;
    ctx.lineWidth = selectedTool === "eraser" ? 15 : penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (selectedTool === "eraser") {
      ctx.clearRect(x - 7.5, y - 7.5, 15, 15);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "eraser") {
      ctx.clearRect(x - 7.5, y - 7.5, 15, 15);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
  };

  return (
    <div ref={containerRef} className="premium-notebook-editor">
      {/* Cabeçalho Premium */}
      <div className="notebook-header">
        <div className="header-left">
          <h2 className="notebook-title">{subject}</h2>
          <span className="paper-type-badge">{paperType === "blank" ? "Em Branco" : paperType.charAt(0).toUpperCase() + paperType.slice(1)}</span>
        </div>
        <div className="header-right">
          <button className="icon-btn" title="Salvar">
            <Save size={20} />
          </button>
          <button className="icon-btn" title="Baixar">
            <Download size={20} />
          </button>
          <button className="icon-btn" title="Mais opções">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Área de Edição */}
      <div className="notebook-canvas-container">
        <canvas
          ref={canvasRef}
          className="notebook-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Barra de Ferramentas Flutuante */}
      <div className={`floating-toolbar ${showToolbar ? "visible" : "hidden"}`}>
        <button
          className={`tool-btn ${selectedTool === "pen" ? "active" : ""}`}
          onClick={() => setSelectedTool("pen")}
          title="Caneta"
        >
          <Pen size={18} />
        </button>
        <button
          className={`tool-btn ${selectedTool === "highlighter" ? "active" : ""}`}
          onClick={() => setSelectedTool("highlighter")}
          title="Marca-texto"
        >
          <Highlighter size={18} />
        </button>
        <button
          className={`tool-btn ${selectedTool === "eraser" ? "active" : ""}`}
          onClick={() => setSelectedTool("eraser")}
          title="Borracha"
        >
          <Eraser size={18} />
        </button>
        <div className="toolbar-divider" />
        <button className="tool-btn" title="Adicionar Texto">
          <Type size={18} />
        </button>
        <button className="tool-btn" title="Inserir Imagem">
          <Image size={18} />
        </button>
        <button className="tool-btn" title="Gravar Áudio">
          <Mic size={18} />
        </button>
        <div className="toolbar-divider" />
        <input
          type="color"
          value={penColor}
          onChange={(e) => setPenColor(e.target.value)}
          className="color-picker"
          title="Cor da caneta"
        />
        <input
          type="range"
          min="1"
          max="10"
          value={penSize}
          onChange={(e) => setPenSize(Number(e.target.value))}
          className="size-slider"
          title="Tamanho da caneta"
        />
        <button
          className="toggle-toolbar-btn"
          onClick={() => setShowToolbar(!showToolbar)}
          title="Minimizar barra"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
};
