#!/usr/bin/env bash
# Prepara os órgãos 3D do Human Reference Atlas (HRA) v1.2 usados na biblioteca de órgãos.
# Fonte: https://github.com/hubmapconsortium/ccf-releases (pasta v1.2/models), licença CC BY 4.0.
# Uso: scripts/prepare_hra_organs.sh /caminho/para/ccf-releases/v1.2/models
set -euo pipefail
SRC="${1:?informe a pasta v1.2/models do repositório ccf-releases}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/medicine/models/hra"
mkdir -p "$OUT"

# arquivo-de-origem  nome-de-saída
while read -r src dest; do
  [ -z "$src" ] && continue
  npx --yes @gltf-transform/cli draco "$SRC/$src" "$OUT/$dest" >/dev/null
  echo "ok $dest"
done <<'LIST'
VH_F_Pancreas.glb hra-pancreas-female-v1.glb
VH_F_Spleen.glb hra-spleen-female-v1.glb
VH_F_Thymus.glb hra-thymus-female-v1.glb
VH_F_Small_Intestine.glb hra-small-intestine-female-v1.glb
SBU_F_Intestine_Large.glb hra-large-intestine-female-v1.glb
VH_F_Urinary_Bladder.glb hra-urinary-bladder-female-v1.glb
VH_F_Uterus.glb hra-uterus-female-v1.glb
VH_F_Placenta.glb hra-placenta-female-v1.glb
NIH_F_Lymph_Node.glb hra-lymph-node-female-v1.glb
VH_F_Spinal_Cord.glb hra-spinal-cord-female-v1.glb
VH_M_Pancreas.glb hra-pancreas-male-v1.glb
VH_M_Spleen.glb hra-spleen-male-v1.glb
VH_M_Thymus.glb hra-thymus-male-v1.glb
VH_M_Small_Intestine.glb hra-small-intestine-male-v1.glb
SBU_M_Intestine_Large.glb hra-large-intestine-male-v1.glb
VH_M_Urinary_Bladder.glb hra-urinary-bladder-male-v1.glb
VH_M_Prostate.glb hra-prostate-male-v1.glb
NIH_M_Lymph_Node.glb hra-lymph-node-male-v1.glb
VH_M_Spinal_Cord.glb hra-spinal-cord-male-v1.glb
VH_M_Heart.glb hra-heart-male-v1.glb
VH_M_Liver.glb hra-liver-male-v1.glb
VH_M_Lung.glb hra-lung-male-v1.glb
VH_M_Kidney_L.glb hra-kidney-left-male-v1.glb
VH_M_Kidney_R.glb hra-kidney-right-male-v1.glb
Allen_M_Brain.glb hra-brain-male-v1.glb
VH_F_Eye_L.glb hra-eye-left-female-v1.glb
VH_F_Eye_R.glb hra-eye-right-female-v1.glb
VH_M_Eye_L.glb hra-eye-left-male-v1.glb
VH_M_Eye_R.glb hra-eye-right-male-v1.glb
VH_F_Fallopian_Tube_L.glb hra-fallopian-tube-left-female-v1.glb
VH_F_Fallopian_Tube_R.glb hra-fallopian-tube-right-female-v1.glb
VH_F_Ureter_L.glb hra-ureter-left-female-v1.glb
VH_F_Ureter_R.glb hra-ureter-right-female-v1.glb
VH_M_Ureter_L.glb hra-ureter-left-male-v1.glb
VH_M_Ureter_R.glb hra-ureter-right-male-v1.glb
VH_F_Knee_L.glb hra-knee-left-female-v1.glb
VH_M_Knee_L.glb hra-knee-left-male-v1.glb
LIST
