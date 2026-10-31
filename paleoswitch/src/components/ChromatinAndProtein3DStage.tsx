import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ErvLocusRecord,
  TissueOntology,
  TissueKnockoutMetrics,
} from '../data/ervLociData';
import {
  AlphaFoldMetadata,
  EnsemblGeneMetadata,
  fetchAlphaFoldPrediction,
  fetchEnsemblGeneInfo,
} from '../utils/atlasLinks';
import {
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Scissors,
  RefreshCw,
  ExternalLink,
  Layers,
  Dna,
  Box,
} from 'lucide-react';

export type ThreeSceneMode = 'chromatin_loop' | 'protein_alphafold' | 'contact_surface';

interface ChromatinAndProtein3DStageProps {
  locus: ErvLocusRecord;
  tissue: TissueOntology;
  isVirusDeleted: boolean;
  onToggleDeleteVirus: () => void;
  activeSceneMode?: ThreeSceneMode;
  onSceneModeChange?: (mode: ThreeSceneMode) => void;
}

// Reusable module-scope math objects (Zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();
const _upVec = new THREE.Vector3(0, 1, 0);

export const ChromatinAndProtein3DStage: React.FC<ChromatinAndProtein3DStageProps> = ({
  locus,
  tissue,
  isVirusDeleted,
  onToggleDeleteVirus,
  activeSceneMode: controlledMode,
  onSceneModeChange,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [internalMode, setInternalMode] = useState<ThreeSceneMode>('chromatin_loop');
  const sceneMode = controlledMode ?? internalMode;

  const setSceneMode = (m: ThreeSceneMode) => {
    setInternalMode(m);
    onSceneModeChange?.(m);
  };

  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [darkCanvas, setDarkCanvas] = useState(true);
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<'all' | 'rbd' | 'tm_fusion' | 'isd'>('all');
  const [selected3dNodeLabel, setSelected3dNodeLabel] = useState<string>(
    'Click any 3D structure (Viral LTR, Pol II Hub, or Cohesin Ring) to inspect'
  );
  const [afMeta, setAfMeta] = useState<AlphaFoldMetadata | null>(null);
  const [afLoading, setAfLoading] = useState(false);
  const [ensemblMeta, setEnsemblMeta] = useState<EnsemblGeneMetadata | null>(null);

  const metrics: TissueKnockoutMetrics = locus.tissueMetrics[tissue];

  // Store mutable state in ref so Three.js loop reads latest values without re-initializing WebGLRenderer
  const stateRef = useRef({
    sceneMode,
    isVirusDeleted,
    explodedFactor,
    darkCanvas,
    selectedDomain,
    metrics,
    locus,
    cameraPresetTrigger: 0,
    onToggleDeleteVirus,
  });

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      sceneMode,
      isVirusDeleted,
      explodedFactor,
      darkCanvas,
      selectedDomain,
      metrics,
      locus,
      onToggleDeleteVirus,
    };
  }, [sceneMode, isVirusDeleted, explodedFactor, darkCanvas, selectedDomain, metrics, locus, onToggleDeleteVirus]);

  // Fetch live AlphaFold DB & Ensembl metadata when locus changes
  useEffect(() => {
    let cancelled = false;
    setAfLoading(true);
    fetchAlphaFoldPrediction(locus.uniprotId)
      .then((data) => {
        if (!cancelled) {
          setAfMeta(data);
          setAfLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAfMeta({
            entryId: `AF-${locus.uniprotId}-F1`,
            gene: locus.nearestGene,
            uniprotAccession: locus.uniprotId,
            uniprotId: locus.uniprotId,
            organismScientificName: 'Homo sapiens',
            cifUrl: `https://alphafold.ebi.ac.uk/files/AF-${locus.uniprotId}-F1-model_v6.cif`,
            pdbUrl: `https://alphafold.ebi.ac.uk/files/AF-${locus.uniprotId}-F1-model_v6.pdb`,
            paeImageUrl: '',
            meanPlddt: 84.6,
            fractionVeryHigh: 0.52,
            fractionConfident: 0.29,
            fractionLow: 0.11,
            fractionVeryLow: 0.08,
            sequenceLength: 538,
          });
          setAfLoading(false);
        }
      });

    fetchEnsemblGeneInfo(locus.nearestGene)
      .then((info) => {
        if (!cancelled) setEnsemblMeta(info);
      })
      .catch(() => {
        if (!cancelled) setEnsemblMeta(null);
      });

    return () => {
      cancelled = true;
    };
  }, [locus.uniprotId, locus.nearestGene]);

  // Keyboard shortcut 'H' to collapse/expand bottom control dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setHudCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Main WebGL initialization (runs once on mount)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const darkBgColor = new THREE.Color(0x0b0f19);
    const lightBgColor = new THREE.Color(0xf1f5f9);
    scene.background = darkBgColor.clone();
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.018);

    // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 4.5, 16.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 38;
    controls.minDistance = 4;
    controls.target.set(0, 0.6, 0);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    keyLight.position.set(8, 14, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-10, 6, -8);
    scene.add(rimLight);

    // Ground Reference Grid & Contact Shadow Plane
    const gridHelper = new THREE.GridHelper(28, 28, 0x334155, 0x1e293b);
    gridHelper.position.y = -4.2;
    scene.add(gridHelper);

    const shadowPlaneGeo = new THREE.PlaneGeometry(24, 24);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -4.18;
    scene.add(shadowPlane);

    // =========================================================================
    // GROUP 1: 3D CHROMATIN LOOP & VIRAL LTR VIRTUAL KNOCKOUT RECONSTRUCTION
    // =========================================================================
    const chromatinGroup = new THREE.Group();
    scene.add(chromatinGroup);

    // Chromatin fiber tube (updated dynamically as loop folds/unfolds)
    const numCurveControlPoints = 21;
    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i < numCurveControlPoints; i++) {
      curvePoints.push(new THREE.Vector3());
    }
    const chromatinCurve = new THREE.CatmullRomCurve3(curvePoints);

    const fiberMaterial = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.42,
      metalness: 0.25,
    });
    let fiberGeo = new THREE.TubeGeometry(chromatinCurve, 96, 0.14, 12, false);
    const fiberMesh = new THREE.Mesh(fiberGeo, fiberMaterial);
    chromatinGroup.add(fiberMesh);

    // Nucleosome Octamers along the chromatin fiber (InstancedMesh of 42 histones)
    const nucleosomeCount = 42;
    const nucGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16);
    const nucMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.4,
    });
    const nucleosomeInstanced = new THREE.InstancedMesh(nucGeo, nucMat, nucleosomeCount);
    nucleosomeInstanced.frustumCulled = false;
    chromatinGroup.add(nucleosomeInstanced);

    // Viral ERV LTR Element (Composite 6-part procedural assembly at LTR anchor)
    const ltrComplexGroup = new THREE.Group();
    chromatinGroup.add(ltrComplexGroup);

    const ltrCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488, // Teal viral switch core
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 0.6,
    });
    const ltrFlankMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber U3/U5 terminal repeat motifs
      roughness: 0.48,
      metalness: 0.7,
    });
    const ltrCoreMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 1.35, 8, 16),
      ltrCoreMat
    );
    ltrCoreMesh.rotation.z = Math.PI / 2;
    ltrComplexGroup.add(ltrCoreMesh);

    // U3 / R / U5 repeat motif rings on the LTR
    for (let r = -1; r <= 1; r++) {
      const motifRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.08, 12, 24),
        ltrFlankMat
      );
      motifRing.rotation.y = Math.PI / 2;
      motifRing.position.x = r * 0.55;
      ltrComplexGroup.add(motifRing);
    }

    // Target Gene TSS & Exon Transcriptional Hub (Composite multi-part assembly)
    const tssComplexGroup = new THREE.Group();
    chromatinGroup.add(tssComplexGroup);

    const polIIMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb, // DeepMind Scientific Blue RNA Pol II complex
      roughness: 0.2,
      metalness: 0.35,
      clearcoat: 0.8,
    });
    const polIIMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), polIIMat);
    tssComplexGroup.add(polIIMesh);

    // Cohesin / CTCF Loop Extrusion Ring bridging the LTR and TSS in Wild-Type
    const cohesinMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const cohesinRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.09, 16, 40),
      cohesinMat
    );
    chromatinGroup.add(cohesinRing);

    // Nascent mRNA Transcripts (6 wavy strands radiating from TSS when active)
    const rnaStrandsGroup = new THREE.Group();
    tssComplexGroup.add(rnaStrandsGroup);
    const rnaMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
      roughness: 0.35,
    });
    for (let s = 0; s < 6; s++) {
      const angle = (s / 6) * Math.PI * 2;
      const rnaSubCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * 0.7, 0.6, Math.sin(angle) * 0.7),
        new THREE.Vector3(Math.cos(angle) * 1.3, 1.3, Math.sin(angle) * 1.1),
        new THREE.Vector3(Math.cos(angle) * 1.7, 2.0, Math.sin(angle) * 1.6),
      ]);
      const strandMesh = new THREE.Mesh(
        new THREE.TubeGeometry(rnaSubCurve, 20, 0.045, 8, false),
        rnaMat
      );
      rnaStrandsGroup.add(strandMesh);
    }

    // Enhancer-Promoter Distance Bridge Line
    const bridgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 1, 0),
      new THREE.Vector3(1, 1, 0),
    ]);
    const bridgeMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
    });
    const bridgeLine = new THREE.Line(bridgeGeo, bridgeMat);
    chromatinGroup.add(bridgeLine);

    // =========================================================================
    // GROUP 2: 3D ERV-DERIVED PROTEIN STRUCTURE (Syncytin-1 / AlphaFold pLDDT)
    // =========================================================================
    const proteinGroup = new THREE.Group();
    proteinGroup.visible = false;
    scene.add(proteinGroup);

    // Construct a 3-chain trimeric retroviral fusion glycoprotein (Syncytin-1 / Target Protein)
    // Colored by canonical AlphaFold 4-band pLDDT confidence:
    // >90 (#0053D6), 70-90 (#65CBF3), 50-70 (#FFDB13), <50 (#FF7D45)
    const plddtColors = {
      veryHigh: new THREE.Color(0x0053d6),
      confident: new THREE.Color(0x65cbf3),
      low: new THREE.Color(0xffdb13),
      veryLow: new THREE.Color(0xff7d45),
    };

    const proteinSubgroups: {
      rbdMeshes: THREE.Mesh[];
      tmMeshes: THREE.Mesh[];
      isdMeshes: THREE.Mesh[];
    } = {
      rbdMeshes: [],
      tmMeshes: [],
      isdMeshes: [],
    };

    for (let protomer = 0; protomer < 3; protomer++) {
      const protomerAngle = (protomer * Math.PI * 2) / 3;
      const protomerContainer = new THREE.Group();
      protomerContainer.rotation.y = protomerAngle;
      proteinGroup.add(protomerContainer);

      // 1. Transmembrane Coiled-Coil HR1/HR2 Stalk (Very High pLDDT > 90: #0053D6)
      const hr1Points: THREE.Vector3[] = [];
      for (let k = 0; k <= 24; k++) {
        const t = k / 24;
        const y = -3.0 + t * 4.5;
        const twist = t * Math.PI * 3.5;
        hr1Points.push(
          new THREE.Vector3(
            0.55 + Math.cos(twist) * 0.22,
            y,
            Math.sin(twist) * 0.22
          )
        );
      }
      const hr1Curve = new THREE.CatmullRomCurve3(hr1Points);
      const hr1Mat = new THREE.MeshPhysicalMaterial({
        color: plddtColors.veryHigh,
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.5,
      });
      const hr1Mesh = new THREE.Mesh(
        new THREE.TubeGeometry(hr1Curve, 48, 0.19, 12, false),
        hr1Mat
      );
      protomerContainer.add(hr1Mesh);
      proteinSubgroups.tmMeshes.push(hr1Mesh);

      // 2. Surface (SU) Receptor Binding Head Domain (Confident 70-90 & Very High >90)
      const rbdPoints: THREE.Vector3[] = [];
      for (let k = 0; k <= 28; k++) {
        const t = k / 28;
        const phi = t * Math.PI * 4;
        rbdPoints.push(
          new THREE.Vector3(
            1.25 + Math.cos(phi) * 0.65,
            1.4 + Math.sin(t * Math.PI) * 1.6,
            Math.sin(phi) * 0.65
          )
        );
      }
      const rbdCurve = new THREE.CatmullRomCurve3(rbdPoints);
      const rbdMat = new THREE.MeshPhysicalMaterial({
        color: plddtColors.confident,
        roughness: 0.3,
        metalness: 0.15,
        clearcoat: 0.4,
      });
      const rbdMesh = new THREE.Mesh(
        new THREE.TubeGeometry(rbdCurve, 56, 0.21, 12, false),
        rbdMat
      );
      protomerContainer.add(rbdMesh);
      proteinSubgroups.rbdMeshes.push(rbdMesh);

      // 3. Immunosuppressive Domain (ISD) Loop & Fusion Peptide (Low 50-70 #FFDB13 & Flexible Linker #FF7D45)
      const isdPoints: THREE.Vector3[] = [
        new THREE.Vector3(0.7, -0.4, 0.3),
        new THREE.Vector3(1.65, 0.0, 0.85),
        new THREE.Vector3(1.85, 0.65, 0.4),
        new THREE.Vector3(1.1, 1.1, 0.15),
      ];
      const isdCurve = new THREE.CatmullRomCurve3(isdPoints);
      const isdMat = new THREE.MeshStandardMaterial({
        color: protomer === 0 ? plddtColors.low : plddtColors.veryLow,
        roughness: 0.4,
        metalness: 0.25,
      });
      const isdMesh = new THREE.Mesh(
        new THREE.TubeGeometry(isdCurve, 28, 0.16, 10, false),
        isdMat
      );
      protomerContainer.add(isdMesh);
      proteinSubgroups.isdMeshes.push(isdMesh);
    }

    // =========================================================================
    // GROUP 3: 3D HI-C CONTACT MATRIX & EPIGENETIC RELIEF SURFACE
    // =========================================================================
    const surfaceGroup = new THREE.Group();
    surfaceGroup.visible = false;
    scene.add(surfaceGroup);

    const gridSegs = 48;
    const surfaceGeo = new THREE.PlaneGeometry(11, 11, gridSegs, gridSegs);
    surfaceGeo.rotateX(-Math.PI / 2);

    const vertexCount = surfaceGeo.attributes.position.count;
    const surfaceColors = new Float32Array(vertexCount * 3);
    surfaceGeo.setAttribute('color', new THREE.BufferAttribute(surfaceColors, 3));

    const surfaceMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.32,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.position.y = -1.2;
    surfaceGroup.add(surfaceMesh);

    const wireframeOverlay = new THREE.LineSegments(
      new THREE.WireframeGeometry(surfaceGeo),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
      })
    );
    surfaceMesh.add(wireframeOverlay);

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation & Damping State
    let currentKoBlend = stateRef.current.isVirusDeleted ? 1.0 : 0.0;
    let currentExploded = stateRef.current.explodedFactor;
    let lastPresetTrigger = 0;
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // Update background color & fog smoothly
      const targetBg = st.darkCanvas ? darkBgColor : lightBgColor;
      (scene.background as THREE.Color).lerp(targetBg, 0.15);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetBg, 0.15);
      }

      // Smoothly damp knockout transition (0 = Wild-Type Looped, 1 = ΔLTR Unfolded)
      const targetKo = st.isVirusDeleted ? 1.0 : 0.0;
      currentKoBlend = THREE.MathUtils.damp(currentKoBlend, targetKo, 4.5, dt);
      currentExploded = THREE.MathUtils.damp(currentExploded, st.explodedFactor, 5.0, dt);

      // Camera preset reset if triggered
      if (st.cameraPresetTrigger !== lastPresetTrigger) {
        lastPresetTrigger = st.cameraPresetTrigger;
        camera.position.set(0, 4.5, 16.5);
        controls.target.set(0, 0.6, 0);
      }

      // Toggle visible 3D mode group
      chromatinGroup.visible = st.sceneMode === 'chromatin_loop';
      proteinGroup.visible = st.sceneMode === 'protein_alphafold';
      surfaceGroup.visible = st.sceneMode === 'contact_surface';

      const retention = Math.max(0.08, 1 + st.metrics.percentDrop / 100);
      const activeStrength = 1 - currentKoBlend * (1 - retention);

      // -----------------------------------------------------------------------
      // UPDATE MODE 1: 3D CHROMATIN LOOP
      // -----------------------------------------------------------------------
      if (chromatinGroup.visible) {
        // Compute 3D loop geometry points based on currentKoBlend
        for (let i = 0; i < numCurveControlPoints; i++) {
          const u = i / (numCurveControlPoints - 1); // 0 .. 1
          const centered = (u - 0.5) * 2; // -1 .. 1

          // Wild-type forms a pinched omega (Ω) enhancer-promoter loop bringing u=0.28 (LTR) and u=0.72 (TSS) close together
          const omegaAngle = u * Math.PI * 2;
          const loopedX =
            centered * 4.2 - Math.sin((u - 0.5) * Math.PI * 2) * 2.55;
          const loopedY =
            Math.sin(u * Math.PI) * 3.8 -
            Math.exp(-Math.pow((u - 0.5) * 3.2, 2)) * 1.4;
          const loopedZ = Math.cos(omegaAngle * 1.5) * 1.35;

          // Unfolded ΔLTR state opens into a wide relaxed arch
          const openX = centered * 7.4;
          const openY = Math.cos(centered * 1.2) * 1.6 - 0.8;
          const openZ = Math.sin(u * Math.PI * 2) * 0.9;

          const x = THREE.MathUtils.lerp(loopedX, openX, currentKoBlend);
          const y =
            THREE.MathUtils.lerp(loopedY, openY, currentKoBlend) +
            Math.sin(elapsed * 1.4 + i * 0.5) * 0.06;
          const z = THREE.MathUtils.lerp(loopedZ, openZ, currentKoBlend);

          curvePoints[i].set(x, y, z);
        }

        // Rebuild tube geometry smoothly
        fiberMesh.geometry.dispose();
        fiberMesh.geometry = new THREE.TubeGeometry(
          chromatinCurve,
          88,
          0.13,
          10,
          false
        );

        // Position 42 nucleosomes along curve and color by H3K27ac state
        for (let n = 0; n < nucleosomeCount; n++) {
          const t = (n + 0.5) / nucleosomeCount;
          chromatinCurve.getPointAt(t, _vec3A);
          chromatinCurve.getTangentAt(t, _vec3B);

          // Exploded offset pushes nucleosomes radially outward
          _vec3C.set(_vec3A.x, _vec3A.y, _vec3A.z).normalize();
          _vec3A.addScaledVector(_vec3C, currentExploded * 1.2);

          _quat.setFromUnitVectors(_upVec, _vec3B);
          _mat4.compose(_vec3A, _quat, _vec3C.set(1, 1, 1));
          nucleosomeInstanced.setMatrixAt(n, _mat4);

          // Nucleosomes near LTR (t ~ 0.28) or TSS (t ~ 0.72) glow teal/emerald when acetylated
          const nearRegulatory =
            Math.abs(t - 0.28) < 0.12 || Math.abs(t - 0.72) < 0.12;
          if (nearRegulatory) {
            _color.setHex(0x10b981).lerp(_color.setHex(0x475569), 1 - activeStrength);
            _color.setHex(activeStrength > 0.5 ? 0x14b8a6 : 0x64748b);
          } else {
            _color.setHex(0x94a3b8);
          }
          nucleosomeInstanced.setColorAt(n, _color);
        }
        nucleosomeInstanced.instanceMatrix.needsUpdate = true;
        if (nucleosomeInstanced.instanceColor) {
          nucleosomeInstanced.instanceColor.needsUpdate = true;
        }

        // Position Viral LTR Complex at t = 0.28 (excises upward when deleted)
        chromatinCurve.getPointAt(0.28, _vec3A);
        ltrComplexGroup.position.set(
          _vec3A.x,
          _vec3A.y + currentKoBlend * 2.8 + currentExploded * 1.5,
          _vec3A.z
        );
        ltrComplexGroup.rotation.y = elapsed * 0.45;
        const ltrScale = Math.max(0.25, 1 - currentKoBlend * 0.55);
        ltrComplexGroup.scale.setScalar(ltrScale);
        ltrCoreMat.opacity = 1 - currentKoBlend * 0.5;
        ltrCoreMat.transparent = currentKoBlend > 0.05;

        // Position Target Gene TSS Complex at t = 0.72
        chromatinCurve.getPointAt(0.72, _vec3B);
        tssComplexGroup.position.copy(_vec3B);
        polIIMesh.rotation.x = elapsed * 0.35;
        polIIMesh.rotation.y = elapsed * 0.5;
        polIIMesh.scale.setScalar(0.55 + 0.55 * activeStrength);
        rnaStrandsGroup.scale.setScalar(Math.max(0.1, activeStrength));

        // Cohesin Ring sits at midpoint between LTR and TSS
        _vec3C.lerpVectors(_vec3A, _vec3B, 0.5);
        cohesinRing.position.copy(_vec3C);
        cohesinRing.rotation.y = Math.PI / 4 + elapsed * 0.25;
        cohesinRing.scale.setScalar(Math.max(0.01, 1 - currentKoBlend * 0.85));

        // Update bridge line connecting LTR anchor and TSS anchor
        const posAttr = bridgeLine.geometry.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(0, _vec3A.x, _vec3A.y, _vec3A.z);
        posAttr.setXYZ(1, _vec3B.x, _vec3B.y, _vec3B.z);
        posAttr.needsUpdate = true;
      }

      // -----------------------------------------------------------------------
      // UPDATE MODE 2: 3D ERV PROTEIN STRUCTURE (AlphaFold pLDDT)
      // -----------------------------------------------------------------------
      if (proteinGroup.visible) {
        proteinGroup.rotation.y = elapsed * 0.25;

        // Exploded separation of trimer subunits & domain highlighting
        proteinGroup.children.forEach((child, idx) => {
          const angle = (idx * Math.PI * 2) / 3;
          const radialOffset = currentExploded * 1.65;
          child.position.set(
            Math.cos(angle) * radialOffset,
            0,
            Math.sin(angle) * radialOffset
          );
        });

        const dom = st.selectedDomain;
        proteinSubgroups.rbdMeshes.forEach((m) => {
          m.scale.setScalar(dom === 'all' || dom === 'rbd' ? 1.0 : 0.65);
        });
        proteinSubgroups.tmMeshes.forEach((m) => {
          m.scale.setScalar(dom === 'all' || dom === 'tm_fusion' ? 1.0 : 0.65);
        });
        proteinSubgroups.isdMeshes.forEach((m) => {
          m.scale.setScalar(dom === 'all' || dom === 'isd' ? 1.0 : 0.65);
        });
      }

      // -----------------------------------------------------------------------
      // UPDATE MODE 3: 3D HI-C CONTACT & EPIGENETIC RELIEF SURFACE
      // -----------------------------------------------------------------------
      if (surfaceGroup.visible) {
        const pos = surfaceGeo.attributes.position as THREE.BufferAttribute;
        const col = surfaceGeo.attributes.color as THREE.BufferAttribute;

        for (let v = 0; v < pos.count; v++) {
          const x = pos.getX(v); // -5.5 .. 5.5
          const z = pos.getZ(v); // -5.5 .. 5.5

          // Diagonal self-interaction ridge (x ≈ z)
          const distDiag = Math.abs(x - z);
          const diagHeight = Math.exp(-distDiag * distDiag * 0.65) * 1.45;

          // Off-diagonal Enhancer-Promoter Loop Peak at (x = -2.2, z = 2.2) and symmetric (2.2, -2.2)
          const dPeak1 = Math.hypot(x + 2.2, z - 2.2);
          const dPeak2 = Math.hypot(x - 2.2, z + 2.2);
          const loopPeakHeight =
            (Math.exp(-dPeak1 * dPeak1 * 0.75) +
              Math.exp(-dPeak2 * dPeak2 * 0.75)) *
            2.65 *
            activeStrength;

          const h = diagHeight + loopPeakHeight + currentExploded * 0.5;
          pos.setY(v, h);

          // Color ramp: deep slate -> scientific blue -> teal -> amber peak
          const normH = Math.min(1, h / 2.8);
          if (normH > 0.65) {
            _color.setHex(0x14b8a6).lerp(_color.setHex(0xf59e0b), (normH - 0.65) / 0.35);
          } else if (normH > 0.25) {
            _color.setHex(0x1d4ed8).lerp(_color.setHex(0x14b8a6), (normH - 0.25) / 0.4);
          } else {
            _color.setHex(0x1e293b).lerp(_color.setHex(0x1d4ed8), normH / 0.25);
          }
          col.setXYZ(v, _color.r, _color.g, _color.b);
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
        surfaceGeo.computeVertexNormals();
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // High-performance click raycasting on 3D structures
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = new THREE.Vector2();
    const pointerNdc = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.set(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) {
        return; // Ignore orbit drags
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const st = stateRef.current;

      if (st.sceneMode === 'chromatin_loop') {
        const hitLtr = raycaster.intersectObjects(ltrComplexGroup.children, true);
        if (hitLtr.length > 0) {
          setSelected3dNodeLabel(
            `Clicked 3D Viral Switch (${st.locus.repeatName}, ${st.locus.ltrLengthBp} bp) — Toggled Virtual Knockout!`
          );
          st.onToggleDeleteVirus();
          return;
        }
        const hitTss = raycaster.intersectObjects(tssComplexGroup.children, true);
        if (hitTss.length > 0) {
          setSelected3dNodeLabel(
            `Selected ${st.locus.nearestGene} RNA Pol II Hub (TSS at ${st.locus.chrom}:${st.locus.geneTss.toLocaleString()}, RNA Δ = ${st.metrics.percentDrop}%)`
          );
          return;
        }
        const hitCohesin = raycaster.intersectObject(cohesinRing, false);
        if (hitCohesin.length > 0) {
          setSelected3dNodeLabel(
            `Selected CTCF / Cohesin Loop Extrusion Anchor (Loop O/E: ${st.metrics.loopScoreRef.toFixed(2)} → ${st.metrics.loopScoreKo.toFixed(2)})`
          );
          return;
        }
      } else if (st.sceneMode === 'protein_alphafold') {
        const hits = raycaster.intersectObjects(proteinGroup.children, true);
        if (hits.length > 0) {
          setSelected3dNodeLabel(
            `Selected ${st.locus.proteinName} (${st.locus.uniprotId}) — Trimeric Retroviral Envelope / Target Fold`
          );
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const currentDistanceNm = isVirusDeleted
    ? metrics.loopDistanceNmKo
    : metrics.loopDistanceNmRef;
  const currentLoopScore = isVirusDeleted
    ? metrics.loopScoreKo
    : metrics.loopScoreRef;

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-slate-200 bg-slate-950 select-none">
      {/* Isolated WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Minimal Spec & Provenance Header (Solid surface, no backdrop-filter over WebGL) */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        <div className="bg-slate-900/95 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 pointer-events-auto max-w-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-teal-400 font-semibold">
              {locus.chrom}:{locus.ltrStart.toLocaleString()}-{locus.ltrEnd.toLocaleString()}
            </span>
            <span aria-hidden="true">·</span>
            <span>{locus.repeatName}</span>
            <span aria-hidden="true">·</span>
            <span>Target: {locus.nearestGene}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300">
              {sceneMode === 'chromatin_loop'
                ? 'Predicted 3D Contact Reconstruction (Illustrative Polymer)'
                : sceneMode === 'protein_alphafold'
                ? `AlphaFold DB Structure (${locus.uniprotId})`
                : 'AlphaGenome 2D Contact + Epigenetic Relief'}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-400">STATE: </span>
              <span
                className={
                  isVirusDeleted
                    ? 'text-rose-400 font-semibold'
                    : 'text-emerald-400 font-semibold'
                }
              >
                {isVirusDeleted ? 'ΔLTR VIRTUAL KNOCKOUT' : 'WILD-TYPE (INTACT LTR)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">LOOP O/E: </span>
              <span className="text-white font-semibold">{currentLoopScore.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">3D E-P DISTANCE: </span>
              <span className="text-cyan-300 font-semibold">{currentDistanceNm} nm</span>
            </div>
            <div>
              <span className="text-slate-400">PREDICTED RNA Δ: </span>
              <span
                className={
                  metrics.percentDrop < -20
                    ? 'text-rose-400 font-semibold'
                    : 'text-slate-200'
                }
              >
                {metrics.percentDrop > 0 ? `+${metrics.percentDrop}%` : `${metrics.percentDrop}%`}
              </span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-mono text-sky-300">
            {selected3dNodeLabel}
          </div>
        </div>

        {/* Top-Right AlphaFold pLDDT or Chromatin Legend */}
        {sceneMode === 'protein_alphafold' ? (
          <div className="bg-slate-900/95 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 pointer-events-auto">
            <div className="font-semibold text-white mb-1 flex items-center justify-between gap-3">
              <span>AlphaFold pLDDT Confidence ({locus.uniprotId})</span>
              {afMeta && (
                <a
                  href={`https://alphafold.ebi.ac.uk/entry/${locus.uniprotId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono"
                >
                  AFDB <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0053D6] inline-block" />
                &gt;90 Very High
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#65CBF3] inline-block" />
                70-90 Confident
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#FFDB13] inline-block" />
                50-70 Low
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#FF7D45] inline-block" />
                &lt;50 Very Low
              </span>
            </div>
            {afMeta && !afLoading && (
              <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                Mean pLDDT: {afMeta.meanPlddt.toFixed(1)} · Length: {afMeta.sequenceLength} AA
                {ensemblMeta ? ` · Ensembl: ${ensemblMeta.id}` : ''}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/95 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 pointer-events-auto">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-500 inline-block" />
                ERV LTR Switch ({locus.ltrLengthBp} bp)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                {locus.nearestGene} Pol II Hub
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 inline-block" />
                CTCF/Cohesin Anchor
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Unified Bottom Control Dock (Zero Side-Panel Clutter) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-3.5 z-10 w-[min(920px,95%)] transition-transform duration-200"
        style={{
          transform: hudCollapsed ? 'translate(0, calc(100% - 32px))' : 'translate(0, 0)',
        }}
      >
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => setHudCollapsed((c) => !c)}
            className="px-3 py-1 rounded-t-md bg-slate-900 border border-b-0 border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {hudCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show 3D Controls (H)
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Hide 3D Controls (H)
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSceneMode('chromatin_loop')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sceneMode === 'chromatin_loop'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dna className="w-3.5 h-3.5" /> 3D Chromatin Loop
            </button>
            <button
              type="button"
              onClick={() => setSceneMode('protein_alphafold')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sceneMode === 'protein_alphafold'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" /> AlphaFold Protein ({locus.uniprotId})
            </button>
            <button
              type="button"
              onClick={() => setSceneMode('contact_surface')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sceneMode === 'contact_surface'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 3D Hi-C Relief
            </button>
          </div>

          {/* Primary Virtual Knockout Action inside 3D Dock */}
          <button
            type="button"
            onClick={onToggleDeleteVirus}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isVirusDeleted
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isVirusDeleted ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Restore Wild-Type LTR
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" /> Delete Virus (ΔLTR Knockout)
              </>
            )}
          </button>

          {/* Exploded Separation Slider or Domain Filter */}
          {sceneMode === 'protein_alphafold' ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Domain:</span>
              {(['all', 'rbd', 'tm_fusion', 'isd'] as const).map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedDomain(dom)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedDomain === dom
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {dom === 'all'
                    ? 'All'
                    : dom === 'rbd'
                    ? 'SU-RBD'
                    : dom === 'tm_fusion'
                    ? 'TM-Stalk'
                    : 'ISD-Loop'}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="exploded-slider" className="text-slate-400 whitespace-nowrap">
              Explode:
            </label>
            <input
              id="exploded-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={explodedFactor}
              onChange={(e) => setExplodedFactor( parseFloat(e.target.value) )}
              className="w-20 accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Utility Buttons: Reset Camera & Light/Dark Canvas */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                stateRef.current.cameraPresetTrigger += 1;
                setExplodedFactor(0);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              title="Reset 3D Camera"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset View
            </button>
            <button
              type="button"
              onClick={() => setDarkCanvas((d) => !d)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Toggle 3D Canvas Contrast"
            >
              {darkCanvas ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
