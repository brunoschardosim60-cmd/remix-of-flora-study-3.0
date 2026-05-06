import React, { useRef } from "react";
import { Image, Mic, Sticker, X } from "lucide-react";
import "./MediaInsertion.css";

interface MediaInsertionProps {
  onImageInsert?: (file: File) => void;
  onAudioInsert?: (file: File) => void;
  onStickerInsert?: (stickerId: string) => void;
}

const STICKERS = [
  { id: "star", emoji: "⭐", label: "Estrela" },
  { id: "check", emoji: "✅", label: "Verificado" },
  { id: "heart", emoji: "❤️", label: "Coração" },
  { id: "fire", emoji: "🔥", label: "Fogo" },
  { id: "bulb", emoji: "💡", label: "Ideia" },
  { id: "rocket", emoji: "🚀", label: "Foguete" },
  { id: "brain", emoji: "🧠", label: "Cérebro" },
  { id: "target", emoji: "🎯", label: "Alvo" },
];

export const MediaInsertion: React.FC<MediaInsertionProps> = ({
  onImageInsert,
  onAudioInsert,
  onStickerInsert,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [showStickers, setShowStickers] = React.useState(false);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageInsert) {
      onImageInsert(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAudioInsert) {
      onAudioInsert(file);
    }
  };

  return (
    <div className="media-insertion-panel">
      <div className="media-buttons">
        <button
          className="media-btn image-btn"
          onClick={handleImageClick}
          title="Inserir Imagem"
        >
          <Image size={20} />
          <span>Imagem</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />

        <button
          className="media-btn audio-btn"
          onClick={handleAudioClick}
          title="Gravar Áudio"
        >
          <Mic size={20} />
          <span>Áudio</span>
        </button>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          style={{ display: "none" }}
        />

        <button
          className="media-btn sticker-btn"
          onClick={() => setShowStickers(!showStickers)}
          title="Adicionar Sticker"
        >
          <Sticker size={20} />
          <span>Sticker</span>
        </button>
      </div>

      {showStickers && (
        <div className="stickers-panel">
          <div className="stickers-header">
            <h3>Stickers</h3>
            <button
              className="close-btn"
              onClick={() => setShowStickers(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="stickers-grid">
            {STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                className="sticker-item"
                onClick={() => {
                  if (onStickerInsert) {
                    onStickerInsert(sticker.id);
                  }
                  setShowStickers(false);
                }}
                title={sticker.label}
              >
                <span className="sticker-emoji">{sticker.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

