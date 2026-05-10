import React from "react";
import { COLORS } from "../theme";

export const UICard: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bgSoft} 100%)`,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 24,
      padding: 28,
      boxShadow: `0 30px 80px rgba(0,0,0,0.45)`,
      ...style,
    }}
  >
    {children}
  </div>
);