import React, { useState } from "react";
import { Plus, X, MoreVertical } from "lucide-react";
import "./NotebookTabs.css";

interface NotebookTab {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

interface NotebookTabsProps {
  tabs: NotebookTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabAdd?: () => void;
  onTabRemove?: (tabId: string) => void;
  onTabRename?: (tabId: string, newLabel: string) => void;
}

const TAB_COLORS = [
  { name: "Azul", value: "#6366f1" },
  { name: "Vermelho", value: "#dc2626" },
  { name: "Verde", value: "#16a34a" },
  { name: "Laranja", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Cinza", value: "#6b7280" },
];

export const NotebookTabs: React.FC<NotebookTabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabAdd,
  onTabRemove,
  onTabRename,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const handleRenameStart = (tab: NotebookTab) => {
    setEditingTabId(tab.id);
    setEditingLabel(tab.label);
  };

  const handleRenameSave = (tabId: string) => {
    if (onTabRename && editingLabel.trim()) {
      onTabRename(tabId, editingLabel.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div className="notebook-tabs-container">
      <div className="tabs-scroll">
        {tabs.map((tab) => (
          <div key={tab.id} className="tab-wrapper">
            <button
              className={`notebook-tab ${activeTabId === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
              style={{
                borderBottomColor: activeTabId === tab.id ? tab.color : "transparent",
              }}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  className="tab-input"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => handleRenameSave(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSave(tab.id);
                    if (e.key === "Escape") setEditingTabId(null);
                  }}
                  autoFocus
                />
              ) : (
                <span className="tab-label">{tab.label}</span>
              )}
              <div className="tab-color-dot" style={{ backgroundColor: tab.color }} />
            </button>

            {activeTabId === tab.id && (
              <div className="tab-actions">
                <button
                  className="tab-action-btn"
                  onClick={() => handleRenameStart(tab)}
                  title="Renomear"
                >
                  ✏️
                </button>
                <button
                  className="tab-action-btn"
                  onClick={() => setShowColorPicker(showColorPicker === tab.id ? null : tab.id)}
                  title="Mudar cor"
                >
                  🎨
                </button>
                {tabs.length > 1 && (
                  <button
                    className="tab-action-btn remove"
                    onClick={() => onTabRemove?.(tab.id)}
                    title="Remover"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {showColorPicker === tab.id && (
              <div className="color-picker-popup">
                <div className="color-grid">
                  {TAB_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className="color-option"
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        onTabRename?.(tab.id, tab.label);
                        setShowColorPicker(null);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {onTabAdd && (
        <button className="add-tab-btn" onClick={onTabAdd} title="Adicionar nova aba">
          <Plus size={16} />
        </button>
      )}
    </div>
  );
};

