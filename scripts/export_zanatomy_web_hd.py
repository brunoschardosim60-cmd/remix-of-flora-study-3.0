"""Export the official Z-Anatomy Blender atlas as segmented web-HD GLBs.

Run with Blender, not CPython:

  blender -b Startup.blend --factory-startup -noaudio \
    -P scripts/export_zanatomy_web_hd.py -- --output public/medicine/models

The source atlas is intentionally not committed. Download ``Z-Anatomy.zip``
from the official Z-Anatomy repository and point Blender at its
``Startup.blend``. Every exported object keeps its source name in glTF extras
(``anatomyName``) and a semantic layer in ``anatomyType``.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import re
from dataclasses import dataclass
from pathlib import Path

import bpy


GEOMETRY_TYPES = {"MESH", "CURVE", "SURFACE"}
TEMP_COLLECTION = "FLORA_ZANATOMY_WEB_HD"


@dataclass(frozen=True)
class SourceLayer:
    collection: str
    anatomy_type: str
    triangle_target: int


@dataclass(frozen=True)
class ExportDefinition:
    filename: str
    layers: tuple[SourceLayer, ...]


EXPORTS = (
    ExportDefinition(
        "zanatomy-surface-hd-v2.glb",
        (SourceLayer("9: Regions of human body", "surface", 650_000),),
    ),
    ExportDefinition(
        "zanatomy-musculoskeletal-hd-v2.glb",
        (
            SourceLayer("1: Skeletal system", "bone", 1_250_000),
            SourceLayer("4: Muscular system", "muscle", 2_250_000),
        ),
    ),
    ExportDefinition(
        "zanatomy-cardiovascular-hd-v2.glb",
        (SourceLayer("5: Cardiovascular system", "vascular", 1_350_000),),
    ),
    ExportDefinition(
        "zanatomy-nervous-hd-v2.glb",
        (SourceLayer("7: Nervous system & Sense organs", "nervous", 1_200_000),),
    ),
    ExportDefinition(
        "zanatomy-organs-hd-v2.glb",
        (SourceLayer("8: Visceral systems", "organ", 1_100_000),),
    ),
)

# The upstream License.txt identifies these incorporated reference assets as
# NonCommercial. Flora's redistributable web bundle excludes them. Compatible
# HRA kidney models are loaded separately by the application.
NON_COMMERCIAL_NAME_PATTERNS = (
    re.compile(r"\b(kidney|renal pelvis|renal papilla|renal pyramid)\b", re.I),
    re.compile(
        r"\b(cochlea|cochlear|vestibule|vestibular labyrinth|semicircular "
        r"(?:canal|duct)|membranous labyrinth|spiral organ|organ of corti)\b",
        re.I,
    ),
)


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--only", action="append", default=[])
    return parser.parse_args(values)


def is_anatomical_geometry(obj: bpy.types.Object, layer: SourceLayer) -> bool:
    if obj.type not in GEOMETRY_TYPES:
        return False
    # .g objects are floating text glyphs. .j objects in the surface collection
    # are overlapping group shells; the leaf regions already cover the body.
    if obj.name.endswith(".g"):
        return False
    if layer.anatomy_type == "surface" and obj.name.endswith(".j"):
        return False
    if any(pattern.search(obj.name) for pattern in NON_COMMERCIAL_NAME_PATTERNS):
        return False
    return True


def evaluated_mesh(obj: bpy.types.Object, depsgraph: bpy.types.Depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    try:
        mesh = bpy.data.meshes.new_from_object(
            evaluated,
            preserve_all_data_layers=True,
            depsgraph=depsgraph,
        )
    except RuntimeError:
        return None
    return mesh if mesh and len(mesh.polygons) else None


def triangle_count(mesh: bpy.types.Mesh) -> int:
    return sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons)


def remove_temp_collection() -> None:
    collection = bpy.data.collections.get(TEMP_COLLECTION)
    if not collection:
        return
    for obj in list(collection.objects):
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    bpy.data.collections.remove(collection)


def prepare_layer(
    layer: SourceLayer,
    destination: bpy.types.Collection,
    depsgraph: bpy.types.Depsgraph,
) -> dict:
    source = bpy.data.collections.get(layer.collection)
    if source is None:
        raise RuntimeError(f"Collection not found: {layer.collection}")

    prepared = []
    for source_obj in source.all_objects:
        if not is_anatomical_geometry(source_obj, layer):
            continue
        mesh = evaluated_mesh(source_obj, depsgraph)
        if mesh is None:
            continue
        prepared.append((source_obj, mesh, triangle_count(mesh)))

    source_triangles = sum(item[2] for item in prepared)
    if not source_triangles:
        raise RuntimeError(f"No geometry in collection: {layer.collection}")
    ratio = min(1.0, layer.triangle_target / source_triangles)

    exported_triangles = 0
    curve_count = 0
    for index, (source_obj, mesh, triangles) in enumerate(prepared):
        obj = bpy.data.objects.new(f"ZAHD__{layer.anatomy_type}__{index:04d}", mesh)
        obj.matrix_world = source_obj.matrix_world.copy()
        obj["anatomyName"] = source_obj.name
        obj["anatomyType"] = layer.anatomy_type
        obj["sourceCollection"] = layer.collection
        if source_obj.type != "MESH":
            curve_count += 1
        if ratio < 0.999 and triangles >= 450:
            modifier = obj.modifiers.new("FloraWebHD", "DECIMATE")
            modifier.decimate_type = "COLLAPSE"
            modifier.ratio = max(0.025, ratio)
            exported_triangles += max(1, round(triangles * modifier.ratio))
        else:
            exported_triangles += triangles
        destination.objects.link(obj)

    return {
        "collection": layer.collection,
        "anatomyType": layer.anatomy_type,
        "objects": len(prepared),
        "curvesConverted": curve_count,
        "sourceTriangles": source_triangles,
        "targetTriangles": layer.triangle_target,
        "estimatedExportTriangles": exported_triangles,
        "decimateRatio": round(ratio, 6),
    }


def export_definition(definition: ExportDefinition, output: Path) -> dict:
    remove_temp_collection()
    destination = bpy.data.collections.new(TEMP_COLLECTION)
    bpy.context.scene.collection.children.link(destination)
    bpy.context.view_layer.active_layer_collection = (
        bpy.context.view_layer.layer_collection.children[TEMP_COLLECTION]
    )
    depsgraph = bpy.context.evaluated_depsgraph_get()
    started = time.time()
    layers = [prepare_layer(layer, destination, depsgraph) for layer in definition.layers]
    filepath = output / definition.filename

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_active_collection=True,
        use_active_collection_with_nested=False,
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_materials="NONE",
        export_extras=True,
        export_normals=True,
        export_texcoords=False,
        export_tangents=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
    )

    record = {
        "file": definition.filename,
        "bytes": filepath.stat().st_size,
        "layers": layers,
        "seconds": round(time.time() - started, 2),
    }
    print("FLORA_EXPORT", json.dumps(record, ensure_ascii=False))
    remove_temp_collection()
    return record


def main() -> None:
    args = parse_args()
    output = Path(os.path.abspath(args.output))
    output.mkdir(parents=True, exist_ok=True)
    only = set(args.only)
    selected = [item for item in EXPORTS if not only or item.filename in only]
    report = [export_definition(item, output) for item in selected]
    (output / "zanatomy-web-hd-v2.export.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


main()
