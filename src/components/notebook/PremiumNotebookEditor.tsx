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
      for (let x = dotSpacing; x < width; x += dotSpacing) {\n        for (let y = dotSpacing; y < height; y += dotSpacing) {\n          ctx.beginPath();\n          ctx.arc(x, y, 1, 0, Math.PI * 2);\n          ctx.fill();\n        }\n      }\n    }\n  };\n\n  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {\n    if (!canvasRef.current) return;\n    setIsDrawing(true);\n    const canvas = canvasRef.current;\n    const ctx = canvas.getContext(\"2d\");\n    if (!ctx) return;\n\n    const rect = canvas.getBoundingClientRect();\n    const x = e.clientX - rect.left;\n    const y = e.clientY - rect.top;\n\n    ctx.beginPath();\n    ctx.moveTo(x, y);\n    ctx.strokeStyle = selectedTool === \"highlighter\" ? \"rgba(255, 255, 0, 0.4)\" : penColor;\n    ctx.lineWidth = selectedTool === \"eraser\" ? 15 : penSize;\n    ctx.lineCap = \"round\";\n    ctx.lineJoin = \"round\";\n\n    if (selectedTool === \"eraser\") {\n      ctx.clearRect(x - 7.5, y - 7.5, 15, 15);\n    }\n  };\n\n  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {\n    if (!isDrawing || !canvasRef.current) return;\n    const canvas = canvasRef.current;\n    const ctx = canvas.getContext(\"2d\");\n    if (!ctx) return;\n\n    const rect = canvas.getBoundingClientRect();\n    const x = e.clientX - rect.left;\n    const y = e.clientY - rect.top;\n\n    if (selectedTool === \"eraser\") {\n      ctx.clearRect(x - 7.5, y - 7.5, 15, 15);\n    } else {\n      ctx.lineTo(x, y);\n      ctx.stroke();\n    }\n  };\n\n  const handleMouseUp = () => {\n    setIsDrawing(false);\n  };\n\n  const handleSave = () => {\n    if (onSave) {\n      onSave(content);\n    }\n  };\n\n  return (\n    <div ref={containerRef} className=\"premium-notebook-editor\">\n      {/* Cabeçalho Premium */}\n      <div className=\"notebook-header\">\n        <div className=\"header-left\">\n          <h2 className=\"notebook-title\">{subject}</h2>\n          <span className=\"paper-type-badge\">{paperType === \"blank\" ? \"Em Branco\" : paperType.charAt(0).toUpperCase() + paperType.slice(1)}</span>\n        </div>\n        <div className=\"header-right\">\n          <button className=\"icon-btn\" title=\"Salvar\">\n            <Save size={20} />\n          </button>\n          <button className=\"icon-btn\" title=\"Baixar\">\n            <Download size={20} />\n          </button>\n          <button className=\"icon-btn\" title=\"Mais opções\">\n            <MoreVertical size={20} />\n          </button>\n        </div>\n      </div>\n\n      {/* Área de Edição */}\n      <div className=\"notebook-canvas-container\">\n        <canvas\n          ref={canvasRef}\n          className=\"notebook-canvas\"\n          onMouseDown={handleMouseDown}\n          onMouseMove={handleMouseMove}\n          onMouseUp={handleMouseUp}\n          onMouseLeave={handleMouseUp}\n        />\n      </div>\n\n      {/* Barra de Ferramentas Flutuante */}\n      <div className={`floating-toolbar ${showToolbar ? \"visible\" : \"hidden\"}`}>\n        <button\n          className={`tool-btn ${selectedTool === \"pen\" ? \"active\" : \"\"}`}\n          onClick={() => setSelectedTool(\"pen\")}\n          title=\"Caneta\"\n        >\n          <Pen size={18} />\n        </button>\n        <button\n          className={`tool-btn ${selectedTool === \"highlighter\" ? \"active\" : \"\"}`}\n          onClick={() => setSelectedTool(\"highlighter\")}\n          title=\"Marca-texto\"\n        >\n          <Highlighter size={18} />\n        </button>\n        <button\n          className={`tool-btn ${selectedTool === \"eraser\" ? \"active\" : \"\"}`}\n          onClick={() => setSelectedTool(\"eraser\")}\n          title=\"Borracha\"\n        >\n          <Eraser size={18} />\n        </button>\n        <div className=\"toolbar-divider\" />\n        <button className=\"tool-btn\" title=\"Adicionar Texto\">\n          <Type size={18} />\n        </button>\n        <button className=\"tool-btn\" title=\"Inserir Imagem\">\n          <Image size={18} />\n        </button>\n        <button className=\"tool-btn\" title=\"Gravar Áudio\">\n          <Mic size={18} />\n        </button>\n        <div className=\"toolbar-divider\" />\n        <input\n          type=\"color\"\n          value={penColor}\n          onChange={(e) => setPenColor(e.target.value)}\n          className=\"color-picker\"\n          title=\"Cor da caneta\"\n        />\n        <input\n          type=\"range\"\n          min=\"1\"\n          max=\"10\"\n          value={penSize}\n          onChange={(e) => setPenSize(Number(e.target.value))}\n          className=\"size-slider\"\n          title=\"Tamanho da caneta\"\n        />\n        <button\n          className=\"toggle-toolbar-btn\"\n          onClick={() => setShowToolbar(!showToolbar)}\n          title=\"Minimizar barra\"\n        >\n          <ChevronDown size={16} />\n        </button>\n      </div>\n    </div>\n  );\n};\n
