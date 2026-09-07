# Coração realista e biblioteca por representação

## Entrega local

- O coração de neshallads fornecido pelo usuário foi incorporado como `neshallads-heart-realistic-v1.glb`, com bytes originais, três texturas 2K, licença e crédito preservados.
- SHA-256 `5ca211d7ced50856a70cdd0df58e38e1ba3091b2007676d62b5f393ba5629ab7`; 7.555.476 bytes, 22.562 triângulos, uma malha/material. Não contém câmaras/valvas ou vasos separados.
- Biblioteca com filtros Todas / Realistas / Didáticos e por sistema. O catálogo agora contém 34 entradas preexistentes mais um novo modelo realista; não são 35 novos espécimes.
- Os seis candidatos restantes aparecem separados, como referências externas com status de arquivo/licença. Sem iframes automáticos, sem downloads ocultos, sem modelos restritos no registro renderizável.
- Visualizador nativo com carregamento sob demanda, preservação de texturas, enquadramento pelas dimensões reais e proporção da tela, frente/costas, zoom, rotação opcional, recentralização e fundo claro/escuro.
- A cena do atlas é desmontada enquanto o coração realista está aberto. Um canvas observado no DOM. Câmera gira só sob interação ou quando o usuário ativa Girar; DPR limitado a 1,5.
- Voltar ao atlas preserva seu estado; Ver coração didático abre a peça existente sem inventar estruturas internas no modelo realista. Comparação é por alternância, não lado a lado sincronizado.

## Evidência

- Inspeção binária: GLB 2 íntegro; três PNGs 2048×2048 embutidos; mapas de cor, normal e metallic/roughness; sem URLs externas de buffers/texturas.
- 21 testes focados passaram: integridade/hash/material, curadoria, filtros, comandos e regressões de composição e navegação do atlas.
- TypeScript e ESLint dos arquivos alterados verificados.
- QA visual local: coração carregou com texturas; frente, costas, zoom, fundo claro e recentralização conferidos. Layout observado em 1280×800 e 390×844, com enquadramento ajustado ao tamanho real. Sem overflow horizontal no teste móvel. Isso é emulação de viewport, não teste de GPU móvel física ou medição de FPS.
- Navegação de volta ao coração didático conferida no navegador.
- Refinamento para publicação: cabeçalho compacto, comandos em faixa horizontal no celular, área 3D maior, detalhes recolhíveis com atribuição sempre visível, cartões legíveis e filtros com alvos de toque de 44 px. TypeScript, ESLint, build de produção e os 21 testes focados passaram novamente antes da publicação.

## Limites e próximos arquivos

- Chrome autenticado reconheceu a conta e apresentou GLB 2K/1K oficiais. O download automático retornou `ERR_BLOCKED_BY_CLIENT`, inclusive após o usuário alterar uma extensão. Nenhuma proteção foi desativada pelo agente. O coração usado foi o arquivo enviado explicitamente pelo usuário depois disso.
- Pé de tomografia e esqueleto de Terrie continuam aguardando arquivos oficiais e auditoria. Um `Skeleton_NIH3D.glb` antigo foi localizado em Downloads, mas não foi tratado como o modelo editado de Terrie nem incorporado por aproximação.
- Pulmão/cérebro SGU: disponibilidade de arquivo e direitos ainda não confirmados. Crânios UNAM/WitmerLab: restrições não comerciais e, no WitmerLab, de adaptações. Não incorporados.
- Esta entrega não substitui o corpo principal nem implementa dissecção regional nele. Realismo de superfície, composição de camadas e dissecção são capacidades diferentes.
- Fonte do coração: https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089
- Licença: https://creativecommons.org/licenses/by/4.0/
