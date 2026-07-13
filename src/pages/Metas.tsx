import { Navigate } from "react-router-dom";

// Redireciona para a fonte única de verdade das metas (Configurações › Estudo)
export default function Metas() {
  return <Navigate to="/settings?section=study#goals" replace />;
}
