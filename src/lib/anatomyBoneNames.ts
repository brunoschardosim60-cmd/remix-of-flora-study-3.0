// Names present in the Z-Anatomy skeletal asset. Side comes from source metadata,
// never from screen coordinates or a mirrored camera.
const names: Record<string, string> = {
  "parietal bone": "Osso parietal", "frontal bone": "Osso frontal", "occipital bone": "Osso occipital",
  "temporal bone": "Osso temporal", "sphenoid bone": "Osso esfenoide", "ethmoid bone": "Osso etmoide",
  "nasal bone": "Osso nasal", "lacrimal bone": "Osso lacrimal", "zygomatic bone": "Osso zigomático",
  "palatine bone": "Osso palatino", "inferior nasal concha bone": "Concha nasal inferior",
  maxilla: "Maxila", mandible: "Mandíbula", vomer: "Vômer", "hyoid bone": "Osso hioide",
  malleus: "Martelo", incus: "Bigorna", stapes: "Estribo", "sinus of frontal bone": "Seio frontal",
  "sinus of sphenoid bone": "Seio esfenoidal", "atlas (c1)": "Atlas (C1)", "axis (c2)": "Áxis (C2)",
  "body of sternum": "Corpo do esterno", "manubrium of sternum": "Manúbrio do esterno", "xiphoid process": "Processo xifoide",
  clavicle: "Clavícula", scapula: "Escápula", humerus: "Úmero", radius: "Rádio", ulna: "Ulna",
  "hip bone": "Osso do quadril", sacrum: "Sacro", coccyx: "Cóccix", femur: "Fêmur", tibia: "Tíbia", fibula: "Fíbula", patella: "Patela",
  "scaphoid bone": "Osso escafoide", "lunate bone": "Osso semilunar", "triquetrum bone": "Osso piramidal",
  "pisiform bone": "Osso pisiforme", "trapezium bone": "Osso trapézio", "trapezoid bone": "Osso trapezoide",
  "capitate bone": "Osso capitato", "hamate bone": "Osso hamato", talus: "Tálus", calcaneus: "Calcâneo",
  "navicular bone": "Osso navicular", "cuboid bone": "Osso cuboide", "medial cuneiform bone": "Osso cuneiforme medial",
  "intermediate cuneiform bone": "Osso cuneiforme intermédio", "lateral cuneiform bone": "Osso cuneiforme lateral",
  "sesamoid bones of foot": "Ossos sesamoides do pé", "thyroid cartilage": "Cartilagem tireóidea",
  "cricoid cartilage": "Cartilagem cricóidea", "arytenoid cartilage": "Cartilagem aritenóidea",
  "corniculate cartilage": "Cartilagem corniculada", "major alar cartilage": "Cartilagem alar maior",
  "nasal septal cartilage": "Cartilagem do septo nasal", "lateral process of nasal septal cartilage": "Processo lateral da cartilagem do septo nasal",
};
const ordinal = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
export function translatedBoneName(raw: string): string | null {
  const side = raw.match(/\.([lr])$/i)?.[1]?.toLowerCase();
  const key = raw.replace(/\.([lr])$/i, "").toLowerCase();
  let name = names[key];
  const rib = key.match(/^(costal cartilage of )?(\w+) rib$/);
  if (rib && ordinal.includes(rib[2])) name = rib[1] ? `Cartilagem costal da ${ordinal.indexOf(rib[2]) + 1}ª costela` : `${ordinal.indexOf(rib[2]) + 1}ª costela`;
  const digit = key.match(/^(\w+) metacarpal bone$|^(\w+) metatarsal bone$/);
  if (digit) name = `${ordinal.indexOf(digit[1] ?? digit[2]) + 1}º ${digit[1] ? "metacarpal" : "metatarsal"}`;
  const phalanx = key.match(/^(proximal|middle|distal) phalanx of (\w+) finger of (foot|hand)$/);
  if (phalanx) name = `Falange ${{ proximal: "proximal", middle: "média", distal: "distal" }[phalanx[1]]} do ${ordinal.indexOf(phalanx[2]) + 1}º dedo ${phalanx[3] === "foot" ? "do pé" : "da mão"}`;
  const cells = key.match(/^(anterior|middle|posterior) cells of ethmoid bone$/);
  if (cells) name = `Células etmoidais ${{ anterior: "anteriores", middle: "médias", posterior: "posteriores" }[cells[1]]}`;
  const vertebra = key.match(/^vertebra ([ctl]\d+)$/);
  if (vertebra) name = `Vértebra ${vertebra[1].toUpperCase()}`;
  const tooth = key.match(/^(upper|lower) (canine|(?:first|second) (?:molar tooth|premolar)|(?:medial|lateral) incisor)$/);
  if (tooth) {
    const part = tooth[2].replace("first ", "1º ").replace("second ", "2º ").replace("molar tooth", "molar").replace("premolar", "pré-molar").replace("canine", "canino").replace("medial incisor", "incisivo central").replace("lateral incisor", "incisivo lateral");
    name = `Dente ${part} ${tooth[1] === "upper" ? "superior" : "inferior"}`;
  }
  if (!name) return null;
  // Explicit side label avoids agreement ambiguity in long compound names.
  return side ? `${name} — lado ${side === "l" ? "esquerdo" : "direito"}` : name;
}
