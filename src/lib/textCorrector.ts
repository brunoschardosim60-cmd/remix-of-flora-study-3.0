/**
 * Corretor leve PT-BR sem custo de IA.
 * Dicionário de erros comuns de digitação em campos de busca/estudo.
 * Uso: `const fixed = autoCorrect(input)` ou `suggestCorrection(input)`.
 */

const DICT: Record<string, string> = {
  // matérias / disciplinas
  "matematica": "matemática",
  "fisíca": "física",
  "fisica": "física",
  "quimica": "química",
  "biologia": "biologia",
  "historia": "história",
  "geografía": "geografia",
  "portugues": "português",
  "redacao": "redação",
  "filosofia": "filosofia",
  "sociologia": "sociologia",
  "ingles": "inglês",
  "espanhol": "espanhol",
  // temas comuns
  "funcao": "função",
  "funcoes": "funções",
  "equacao": "equação",
  "equacoes": "equações",
  "fracao": "fração",
  "fracoes": "frações",
  "logaritmo": "logaritmo",
  "geometria": "geometria",
  "trigonometria": "trigonometria",
  "fotossintese": "fotossíntese",
  "ecosistema": "ecossistema",
  "celula": "célula",
  "genetica": "genética",
  "evolucao": "evolução",
  "revolucao": "revolução",
  "republica": "república",
  "imperio": "império",
  "constituicao": "constituição",
  "interpretacao": "interpretação",
  "argumentacao": "argumentação",
  "coesao": "coesão",
  "coerencia": "coerência",
  "concordancia": "concordância",
  "regencia": "regência",
  "ortografia": "ortografia",
  "literatura": "literatura",
  // outras
  "exercicio": "exercício",
  "exercicios": "exercícios",
  "questao": "questão",
  "questoes": "questões",
  "resumo": "resumo",
  "aulao": "aulão",
};

/** Substitui palavras conhecidas (case-insensitive, mantém caixa da inicial). */
export function autoCorrect(input: string): string {
  if (!input) return input;
  return input.replace(/[A-Za-zÀ-ÿ]+/g, (word) => {
    const lower = word.toLowerCase();
    const fix = DICT[lower];
    if (!fix) return word;
    return word[0] === word[0].toUpperCase()
      ? fix[0].toUpperCase() + fix.slice(1)
      : fix;
  });
}

/** Retorna sugestão se houver pelo menos 1 correção; senão null. */
export function suggestCorrection(input: string): string | null {
  const fixed = autoCorrect(input);
  return fixed !== input ? fixed : null;
}