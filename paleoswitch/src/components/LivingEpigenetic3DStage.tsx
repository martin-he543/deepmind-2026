import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ErvLocusRecord,
  TissueOntology,
  computeAlphaGenomeTracks,
} from '../data/ervLociData';
import {
  CameraFocus3D,
  PerturbationMode3D,
} from './GuidedDemoWalkthrough';
import {
  Flame,
  Scissors,
  Sparkles,
  RotateCcw,
  Eye,
  Dna,
  ShieldAlert,
  Crosshair,
  Layers,
} from 'lucide-react';

export type EpigeneticGlowModality = 'h3k27ac' | 'atac' | 'rna';

interface LivingEpigenetic3DStageProps {
  locus: ErvLocusRecord;
  tissue: TissueOntology;
  isVirusDeleted: boolean;
  onToggleDeleteVirus: () => void;
  externalPerturbMode?: PerturbationMode3D;
  externalCameraFocus?: CameraFocus3D;
}

export const LivingEpigenetic3DStage: React.FC<LivingEpigenetic3DStageProps> = ({
  locus,
  tissue,
  isVirusDeleted,
  onToggleDeleteVirus,
  externalPerturbMode,
  externalCameraFocus,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [glowModality, setGlowModality] =
    useState<EpigeneticGlowModality>('h3k27ac');
  const [showGhostLoop, setShowGhostLoop] = useState<boolean>(true);
  const [perturbMode, setPerturbMode] = useState<PerturbationMode3D>(
    isVirusDeleted ? 'delta_ltr' : 'wt'
  );
  const [cameraFocus, setCameraFocus] = useState<CameraFocus3D>('macro_loop');
  const [customDosage, setCustomDosage] = useState<number | null>(null);

  // Sync with parent demo walkthrough props
  useEffect(() => {
    if (externalPerturbMode) {
      setPerturbMode(externalPerturbMode);
      setCustomDosage(null);
    } else {
      setPerturbMode(isVirusDeleted ? 'delta_ltr' : 'wt');
    }
  }, [externalPerturbMode, isVirusDeleted]);

  useEffect(() => {
    if (externalCameraFocus) {
      setCameraFocus(externalCameraFocus);
    }
  }, [externalCameraFocus]);

  const metrics = locus.tissueMetrics[tissue];
  const tracks = useMemo(
    () => computeAlphaGenomeTracks(locus, tissue, true),
    [locus, tissue]
  );

  // Compute biological perturbation severity (0.0 = intact WT, 1.0 = full knockout)
  const effectiveSeverity = useMemo(() => {
    if (customDosage !== null) return customDosage;
    switch (perturbMode) {
      case 'wt':
        return 0.0;
      case 'ctrl_alu':
        return 0.02; // Control repeat deletion leaves viral switch intact!
      case 'motif_snv':
        return 0.55; // Single-base TF motif mutation partially disrupts binding
      case 'crispri_krab':
        return 0.85; // dCas9-KRAB epigenetic heterochromatin silencing
      case 'delta_ltr':
        return 1.0; // Full ΔLTR viral excision
    }
  }, [perturbMode, customDosage]);

  const selectPerturbMode = (mode: PerturbationMode3D) => {
    setPerturbMode(mode);
    setCustomDosage(null);
    const shouldDelete = mode === 'delta_ltr' || mode === 'crispri_krab';
    if (shouldDelete !== isVirusDeleted) {
      onToggleDeleteVirus();
    }
  };

  const stateRef = useRef({
    locus,
    tissue,
    metrics,
    tracks,
    perturbMode,
    cameraFocus,
    effectiveSeverity,
    glowModality,
    showGhostLoop,
    shatterLtrTimer: 0,
    shatterAluTimer: 0,
    prevMode: perturbMode,
    selectPerturbMode,
  });

  useEffect(() => {
    const prev = stateRef.current.prevMode;
    const trigLtrShatter = prev !== 'delta_ltr' && perturbMode === 'delta_ltr';
    const trigAluShatter = prev !== 'ctrl_alu' && perturbMode === 'ctrl_alu';

    stateRef.current = {
      ...stateRef.current,
      locus,
      tissue,
      metrics,
      tracks,
      perturbMode,
      cameraFocus,
      effectiveSeverity,
      glowModality,
      showGhostLoop,
      prevMode: perturbMode,
      shatterLtrTimer: trigLtrShatter
        ? 1.0
        : stateRef.current.shatterLtrTimer,
      shatterAluTimer: trigAluShatter
        ? 1.0
        : stateRef.current.shatterAluTimer,
      selectPerturbMode,
    };
  }, [
    locus,
    tissue,
    metrics,
    tracks,
    perturbMode,
    cameraFocus,
    effectiveSeverity,
    glowModality,
    showGhostLoop,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 610;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.014);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 220);
    camera.position.set(0, 3.8, 19.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 38;
    controls.minDistance = 2.8;
    controls.target.set(0, 0.3, 0);

    // Studio + Bioluminescent Lighting
    scene.add(new THREE.AmbientLight(0x94a3b8, 0.7));
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.9);
    keyLight.position.set(10, 18, 12);
    scene.add(keyLight);

    const warmLight = new THREE.PointLight(0xf43f5e, 2.8, 24);
    scene.add(warmLight);

    const geneLight = new THREE.PointLight(0x10b981, 2.8, 24);
    scene.add(geneLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // =========================================================================
    // LAYER A: 3D HOLOGRAPHIC ALPHAGENOME HI-C CONTACT TERRAIN FLOOR
    // =========================================================================
    const hicGridRes = 32;
    const hicFloorGeo = new THREE.PlaneGeometry(
      24,
      16,
      hicGridRes - 1,
      hicGridRes - 1
    );
    hicFloorGeo.rotateX(-Math.PI / 2);
    const hicFloorVertCount = hicFloorGeo.attributes.position.count;
    hicFloorGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(hicFloorVertCount * 3), 3)
    );
    const hicFloorMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.25,
      wireframe: false,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const hicFloorMesh = new THREE.Mesh(hicFloorGeo, hicFloorMat);
    hicFloorMesh.position.set(0, -5.4, 0);
    rootGroup.add(hicFloorMesh);

    // Wireframe overlay on the 3D Hi-C terrain for scientific grid clarity
    const hicWireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const hicWireMesh = new THREE.Mesh(hicFloorGeo, hicWireMat);
    hicWireMesh.position.copy(hicFloorMesh.position);
    rootGroup.add(hicWireMesh);

    // Vertical Laser Drop-Lines connecting 3D Viral LTR & TSS down to the Hi-C Mountain Peak
    const dropLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
    });
    const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const dropLines = new THREE.LineSegments(dropLineGeo, dropLineMat);
    rootGroup.add(dropLines);

    // =========================================================================
    // LAYER B: LOCUS-SPECIFIC 100 KB CHROMATIN POLYMER + GHOST WT BLUEPRINT
    // =========================================================================
    const numCtrl = 36;
    const liveCtrlPts: THREE.Vector3[] = Array.from(
      { length: numCtrl },
      () => new THREE.Vector3()
    );
    const ghostCtrlPts: THREE.Vector3[] = Array.from(
      { length: numCtrl },
      () => new THREE.Vector3()
    );

    // Locus-specific geometry parameters so switching loci changes the 3D fold!
    const getLocusShapeParams = (loc: ErvLocusRecord) => {
      const hash =
        loc.id.charCodeAt(loc.id.length - 1) +
        loc.id.charCodeAt(loc.id.length - 2);
      const distNorm = Math.min(1, loc.distanceToTssBp / 25000);
      return {
        loopRadiusX: 5.2 + distNorm * 1.6,
        loopRadiusY: 4.5 + (hash % 5) * 0.25,
        twistFreq: 3.5 + (hash % 4) * 0.6,
        ltrU: Math.max(0.24, Math.min(0.42, 0.34 - distNorm * 0.08)),
        tssU: 0.62,
        aluU: 0.84,
      };
    };

    const computePolymerPoint = (
      u: number,
      unloop: number,
      timeSec: number,
      loc: ErvLocusRecord,
      target: THREE.Vector3
    ) => {
      const p = getLocusShapeParams(loc);
      const midU = 0.5 * (p.ltrU + p.tssU);
      const theta = (u - midU) * Math.PI * 2.9;

      let lx = Math.sin(theta) * p.loopRadiusX;
      let ly = Math.cos(theta) * p.loopRadiusY + 1.0;
      let lz = Math.sin(u * Math.PI * p.twistFreq) * 1.55;

      const pinchLtr = Math.exp(-Math.pow((u - p.ltrU) / 0.075, 2));
      const pinchTss = Math.exp(-Math.pow((u - p.tssU) / 0.075, 2));
      lx *= 1 - 0.6 * (pinchLtr + pinchTss);
      ly += 1.25 * (pinchLtr + pinchTss);

      // Open untethered conformation
      const ox = (u - 0.5) * 23.5;
      const oy = Math.sin(u * Math.PI * 2.2) * 2.5 - 0.8;
      const oz = Math.cos(u * Math.PI * 3.0) * 2.2;

      const breathe = Math.sin(timeSec * 1.7 + u * 10.0) * 0.11;
      target.set(
        lx * (1 - unloop) + ox * unloop,
        ly * (1 - unloop) + oy * unloop + breathe,
        lz * (1 - unloop) + oz * unloop
      );
    };

    for (let i = 0; i < numCtrl; i++) {
      const u = i / (numCtrl - 1);
      computePolymerPoint(u, 0, 0, stateRef.current.locus, ghostCtrlPts[i]);
      computePolymerPoint(u, 0, 0, stateRef.current.locus, liveCtrlPts[i]);
    }

    const ghostCurve = new THREE.CatmullRomCurve3(ghostCtrlPts);
    const liveCurve = new THREE.CatmullRomCurve3(liveCtrlPts);

    const ghostMesh = new THREE.Mesh(
      new THREE.TubeGeometry(ghostCurve, 110, 0.15, 8, false),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.16,
      })
    );
    rootGroup.add(ghostMesh);

    const tubeSegments = 159;
    let liveTubeGeo = new THREE.TubeGeometry(
      liveCurve,
      tubeSegments,
      0.21,
      12,
      false
    );
    const liveTubeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.25,
      metalness: 0.3,
    });
    const liveTubeMesh = new THREE.Mesh(liveTubeGeo, liveTubeMat);
    rootGroup.add(liveTubeMesh);

    // 48 Nucleosome Histone Cylinders + 72 Epigenetic Fire Aura Rings
    const auraCount = 72;
    const auraGeo = new THREE.TorusGeometry(0.38, 0.06, 10, 24);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const auraInstanced = new THREE.InstancedMesh(auraGeo, auraMat, auraCount);
    rootGroup.add(auraInstanced);

    // =========================================================================
    // LAYER C: 3D VIRAL DNA DOUBLE HELIX & DOCKING TF PROTEINS (INSIDE LTR!)
    // =========================================================================
    const viralHelixGroup = new THREE.Group();
    rootGroup.add(viralHelixGroup);

    const basePairsCount = 18;
    const rungGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8);
    const backboneSphGeo = new THREE.SphereGeometry(0.075, 10, 10);
    const baseColors = [0x10b981, 0x38bdf8, 0xf59e0b, 0xf43f5e];
    const rungMeshes: THREE.Mesh[] = [];

    for (let b = 0; b < basePairsCount; b++) {
      const t = (b / (basePairsCount - 1) - 0.5) * 2.4;
      const angle = b * 0.58;
      const r = 0.34;

      const s1 = new THREE.Mesh(
        backboneSphGeo,
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0x9f1239,
          emissiveIntensity: 0.7,
        })
      );
      s1.position.set(t, Math.cos(angle) * r, Math.sin(angle) * r);
      viralHelixGroup.add(s1);

      const s2 = new THREE.Mesh(
        backboneSphGeo,
        new THREE.MeshStandardMaterial({
          color: 0xfb7185,
          emissive: 0x9f1239,
          emissiveIntensity: 0.7,
        })
      );
      s2.position.set(
        t,
        Math.cos(angle + Math.PI) * r,
        Math.sin(angle + Math.PI) * r
      );
      viralHelixGroup.add(s2);

      const rung = new THREE.Mesh(
        rungGeo,
        new THREE.MeshStandardMaterial({
          color: baseColors[b % 4],
          emissive: baseColors[b % 4],
          emissiveIntensity: 0.65,
        })
      );
      rung.position.set(t, 0, 0);
      rung.rotation.x = angle + Math.PI / 2;
      viralHelixGroup.add(rung);
      rungMeshes.push(rung);
    }

    // 3 Docking Transcription Factor Protein Complexes (Primary TF Dimer + Secondary TF)
    const tfPrimaryMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.36, 1),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    viralHelixGroup.add(tfPrimaryMesh);

    const tfSecondaryMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.32, 1),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    viralHelixGroup.add(tfSecondaryMesh);

    // dCas9-KRAB Heterochromatin Repressor Cage (Visible in 'crispri_krab' mode!)
    const krabCageMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.38, 1),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 1.1,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      })
    );
    viralHelixGroup.add(krabCageMesh);

    // Cohesin / CTCF Extrusion Ring bridging the loop neck
    const cohesinRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.08, 14, 42),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    rootGroup.add(cohesinRing);

    // Target Gene TSS RNA Pol II Hub & Alu/L1 Control Node
    const tssCoreMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.76, 2),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      })
    );
    rootGroup.add(tssCoreMesh);

    const aluCtrlMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 1),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    );
    rootGroup.add(aluCtrlMesh);

    // =========================================================================
    // LAYER D: ENHANCER->PROMOTER PULSES, MRNA FOUNTAIN & SHATTER SHARDS
    // =========================================================================
    const bridgeOrbCount = 14;
    const bridgeOrbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.15, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      bridgeOrbCount
    );
    rootGroup.add(bridgeOrbs);

    const mrnaCount = 90;
    const mrnaInstanced = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.14, 1),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      mrnaCount
    );
    rootGroup.add(mrnaInstanced);

    const mrnaSeeds = Array.from({ length: mrnaCount }, (_, idx) => ({
      phase: (idx / mrnaCount) * Math.PI * 2,
      speed: 0.5 + (idx % 7) * 0.08,
      driftX: ((idx % 5) - 2) * 0.38,
      driftZ: ((idx % 9) - 4) * 0.3,
      exonOffset: (idx % 14) * 0.012,
    }));

    const shardCount = 40;
    const shardGeo = new THREE.TetrahedronGeometry(0.18, 0);
    const ltrShards = new THREE.InstancedMesh(
      shardGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      shardCount
    );
    rootGroup.add(ltrShards);

    const aluShards = new THREE.InstancedMesh(
      shardGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      shardCount
    );
    rootGroup.add(aluShards);

    const shardDirs = Array.from({ length: shardCount }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / shardCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return new THREE.Vector3(
        Math.cos(theta) * Math.sin(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(phi)
      );
    });

    const dummy = new THREE.Object3D();
    const tmpPt = new THREE.Vector3();
    const tmpTan = new THREE.Vector3();
    const tmpCol = new THREE.Color();
    const upVec = new THREE.Vector3(0, 1, 0);
    const desiredCamPos = new THREE.Vector3(0, 3.8, 19.5);
    const desiredTarget = new THREE.Vector3(0, 0.3, 0);

    let currentSeverity = stateRef.current.effectiveSeverity;
    let lastFocus: CameraFocus3D = stateRef.current.cameraFocus;
    let camFlyTimer = 0;
    let animId = 0;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const tSec = (performance.now() - startTime) * 0.001;
      const st = stateRef.current;
      const shape = getLocusShapeParams(st.locus);

      // Smoothly interpolate perturbation severity
      currentSeverity += (st.effectiveSeverity - currentSeverity) * 0.08;

      if (st.shatterLtrTimer > 0) {
        st.shatterLtrTimer = Math.max(0, st.shatterLtrTimer - 0.015);
      }
      if (st.shatterAluTimer > 0) {
        st.shatterAluTimer = Math.max(0, st.shatterAluTimer - 0.015);
      }

      // How much the 3D loop physically unwinds (full in delta_ltr, partial in motif_snv/crispri, 0 in wt/ctrl_alu)
      const targetUnloop =
        st.perturbMode === 'delta_ltr'
          ? currentSeverity
          : st.perturbMode === 'crispri_krab'
          ? currentSeverity * 0.55
          : st.perturbMode === 'motif_snv'
          ? currentSeverity * 0.45
          : 0.0;

      for (let i = 0; i < numCtrl; i++) {
        const u = i / (numCtrl - 1);
        computePolymerPoint(u, 0, tSec * 0.2, st.locus, ghostCtrlPts[i]);
        computePolymerPoint(u, targetUnloop, tSec, st.locus, liveCtrlPts[i]);
      }

      // Update Ghost Wireframe
      ghostMesh.geometry.dispose();
      ghostMesh.geometry = new THREE.TubeGeometry(
        ghostCurve,
        110,
        0.15,
        8,
        false
      );
      ghostMesh.visible = st.showGhostLoop && targetUnloop > 0.06;

      // Update Live Chromatin Tube & Vertex Colors
      liveTubeMesh.geometry.dispose();
      liveTubeGeo = new THREE.TubeGeometry(
        liveCurve,
        tubeSegments,
        0.21,
        12,
        false
      );
      const posAttr = liveTubeGeo.attributes.position;
      const vCount = posAttr.count;
      const colors = new Float32Array(vCount * 3);
      const ringVerts = 13;

      for (let i = 0; i < vCount; i++) {
        const segIdx = Math.min(
          st.tracks.length - 1,
          Math.floor(i / ringVerts)
        );
        const ptData = st.tracks[segIdx];
        let sig = 0.1;
        if (ptData) {
          const refV =
            st.glowModality === 'h3k27ac'
              ? ptData.h3k27acRef
              : st.glowModality === 'atac'
              ? ptData.atacRef
              : ptData.rnaRef;
          const koV =
            st.glowModality === 'h3k27ac'
              ? ptData.h3k27acKo
              : st.glowModality === 'atac'
              ? ptData.atacKo
              : ptData.rnaKo;
          sig = refV * (1 - currentSeverity) + koV * currentSeverity;
        }

        const u = segIdx / tubeSegments;
        const isLtrZone = Math.abs(u - shape.ltrU) < 0.045;
        const isTssZone = u >= shape.tssU - 0.03 && u <= shape.tssU + 0.14;
        const isAluZone = Math.abs(u - shape.aluU) < 0.035;

        if (isLtrZone) {
          if (st.perturbMode === 'delta_ltr') {
            tmpCol.setHex(0x334155);
          } else if (st.perturbMode === 'crispri_krab') {
            tmpCol.setHex(0x7e22ce);
          } else {
            tmpCol.setHex(0xf43f5e).lerp(new THREE.Color(0xfde047), sig * 0.65);
          }
        } else if (isAluZone) {
          tmpCol.setHex(st.perturbMode === 'ctrl_alu' ? 0x334155 : 0xf59e0b);
        } else if (isTssZone) {
          tmpCol
            .setHex(0x064e3b)
            .lerp(new THREE.Color(0x34d399), Math.min(1, sig * 1.3));
        } else {
          tmpCol
            .setHex(0x1e293b)
            .lerp(new THREE.Color(0x38bdf8), Math.min(1, sig * 0.9));
        }

        colors[i * 3] = tmpCol.r;
        colors[i * 3 + 1] = tmpCol.g;
        colors[i * 3 + 2] = tmpCol.b;
      }
      liveTubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      liveTubeMesh.geometry = liveTubeGeo;

      // Key 3D Anchor Coordinates
      const ltrPos = liveCurve.getPointAt(shape.ltrU);
      const ltrTan = liveCurve.getTangentAt(shape.ltrU);
      const tssPos = liveCurve.getPointAt(shape.tssU);
      const aluPos = liveCurve.getPointAt(shape.aluU);

      warmLight.position.copy(ltrPos);
      geneLight.position.copy(tssPos);
      tssCoreMesh.position.copy(tssPos);
      aluCtrlMesh.position.copy(aluPos);
      aluCtrlMesh.scale.setScalar(st.perturbMode === 'ctrl_alu' ? 0.25 : 0.75);
      (aluCtrlMesh.material as THREE.MeshStandardMaterial).wireframe =
        st.perturbMode === 'ctrl_alu';

      // Position & Animate 3D Viral DNA Double Helix + Docking TF Proteins at LTR
      viralHelixGroup.position.copy(ltrPos);
      viralHelixGroup.quaternion.setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        ltrTan
      );
      viralHelixGroup.rotateX(tSec * 0.8);
      const helixScale = st.perturbMode === 'delta_ltr' ? 0.001 : 1.0;
      viralHelixGroup.scale.setScalar(helixScale);

      // Highlight mutated nucleotide rung in 'motif_snv' mode
      rungMeshes.forEach((rm, idx) => {
        const mat = rm.material as THREE.MeshStandardMaterial;
        if (st.perturbMode === 'motif_snv' && idx === 8) {
          mat.color.setHex(0xffffff);
          mat.emissive.setHex(0xf43f5e);
          mat.emissiveIntensity = 2.0 + Math.sin(tSec * 12) * 1.0;
          rm.scale.set(2.2, 1.3, 2.2);
        } else {
          mat.color.setHex(baseColors[idx % 4]);
          mat.emissive.setHex(baseColors[idx % 4]);
          mat.emissiveIntensity = 0.65;
          rm.scale.set(1, 1, 1);
        }
      });

      // Primary TF Protein Dimer: Docked on DNA groove in WT, detaches & drifts away in 'motif_snv' or 'crispri_krab'!
      const tfDetach =
        st.perturbMode === 'motif_snv' || st.perturbMode === 'crispri_krab'
          ? 1.0
          : currentSeverity;
      tfPrimaryMesh.position.set(
        -0.15,
        0.52 + tfDetach * 1.45 + Math.sin(tSec * 3) * 0.08,
        tfDetach * 0.9
      );
      tfPrimaryMesh.rotation.set(tSec * 1.5, tSec * 2.0, 0);

      tfSecondaryMesh.position.set(
        0.45,
        -0.48 - currentSeverity * 0.8,
        0.25
      );
      tfSecondaryMesh.rotation.set(-tSec * 1.2, tSec * 1.8, 0);

      // dCas9-KRAB Heterochromatin Repressor Shield
      krabCageMesh.visible = st.perturbMode === 'crispri_krab';
      krabCageMesh.rotation.set(tSec * 0.9, -tSec * 1.1, 0);
      krabCageMesh.scale.setScalar(1.0 + 0.08 * Math.sin(tSec * 5));

      // Cohesin Ring at the neck between LTR and TSS
      cohesinRing.position.lerpVectors(ltrPos, tssPos, 0.5);
      cohesinRing.lookAt(tssPos);
      cohesinRing.visible = targetUnloop < 0.45;
      cohesinRing.scale.setScalar(1.0 - targetUnloop * 0.6);

      // Smooth Camera Fly-In when user switches Camera Focus ('macro_loop' | 'viral_helix' | 'pol2_hub')
      if (st.cameraFocus !== lastFocus) {
        lastFocus = st.cameraFocus;
        camFlyTimer = 1.0;
      }
      if (camFlyTimer > 0) {
        camFlyTimer = Math.max(0, camFlyTimer - 0.02);
        if (st.cameraFocus === 'viral_helix') {
          desiredTarget.copy(ltrPos);
          desiredCamPos.copy(ltrPos).add(new THREE.Vector3(0.5, 1.4, 5.2));
        } else if (st.cameraFocus === 'pol2_hub') {
          desiredTarget.copy(tssPos);
          desiredCamPos.copy(tssPos).add(new THREE.Vector3(0.5, 1.6, 6.2));
        } else {
          desiredTarget.set(0, 0.2, 0);
          desiredCamPos.set(0, 3.8, 19.5);
        }
        controls.target.lerp(desiredTarget, 0.12);
        camera.position.lerp(desiredCamPos, 0.12);
      }

      // =====================================================================
      // UPDATE 3D HOLOGRAPHIC HI-C CONTACT TERRAIN FLOOR & LASER DROP-LINES
      // =====================================================================
      const floorPos = hicFloorGeo.attributes.position;
      const floorCol = hicFloorGeo.attributes.color;
      const activeLoopStrength =
        (st.metrics.loopScoreRef * (1 - currentSeverity) +
          st.metrics.loopScoreKo * currentSeverity) /
        4.2;

      for (let v = 0; v < hicFloorVertCount; v++) {
        const fx = floorPos.getX(v);
        const fz = floorPos.getZ(v);

        // Diagonal TAD ridge + focal Enhancer-Promoter contact mountain under the loop neck
        const diagDist = Math.abs(fx * 0.55 + fz);
        const tadRidge = Math.exp(-diagDist * diagDist * 0.18) * 0.65;

        const dPeak = Math.hypot(fx - (ltrPos.x + tssPos.x) * 0.5, fz - 0.5);
        const epMountain =
          Math.exp(-dPeak * dPeak * 0.16) * 3.1 * activeLoopStrength;

        const elev = tadRidge + epMountain;
        floorPos.setY(v, elev);

        const normE = Math.min(1, elev / 2.8);
        if (normE > 0.55) {
          tmpCol
            .setHex(0x06b6d4)
            .lerp(new THREE.Color(0xf43f5e), (normE - 0.55) / 0.45);
        } else {
          tmpCol
            .setHex(0x0f172a)
            .lerp(new THREE.Color(0x0284c7), normE / 0.55);
        }
        floorCol.setXYZ(v, tmpCol.r, tmpCol.g, tmpCol.b);
      }
      floorPos.needsUpdate = true;
      floorCol.needsUpdate = true;
      hicFloorGeo.computeVertexNormals();

      // Update vertical laser drop-lines from LTR and TSS to the Hi-C floor peak
      const dlPos = dropLines.geometry.attributes.position;
      const peakX = (ltrPos.x + tssPos.x) * 0.5;
      const peakY = -5.4 + 0.65 + 3.1 * activeLoopStrength;
      dlPos.setXYZ(0, ltrPos.x, ltrPos.y, ltrPos.z);
      dlPos.setXYZ(1, peakX, peakY, 0.5);
      dlPos.setXYZ(2, tssPos.x, tssPos.y, tssPos.z);
      dlPos.setXYZ(3, peakX, peakY, 0.5);
      dlPos.needsUpdate = true;

      // =====================================================================
      // UPDATE EPIGENETIC FIRE RINGS, PULSES, MRNA FOUNTAIN & SHATTER SHARDS
      // =====================================================================
      const koRetention = Math.min(
        1.0,
        Math.max(0.06, Math.pow(2, st.metrics.rnaLog2FC))
      );
      const activeRetention =
        1.0 * (1 - currentSeverity) + koRetention * currentSeverity;

      for (let i = 0; i < auraCount; i++) {
        const u = (i + 0.5) / auraCount;
        liveCurve.getPointAt(u, tmpPt);
        liveCurve.getTangentAt(u, tmpTan);

        const binIdx = Math.min(
          st.tracks.length - 1,
          Math.floor(u * (st.tracks.length - 1))
        );
        const trk = st.tracks[binIdx];
        let val = 0.1;
        if (trk) {
          const rV =
            st.glowModality === 'h3k27ac'
              ? trk.h3k27acRef
              : st.glowModality === 'atac'
              ? trk.atacRef
              : trk.rnaRef;
          const kV =
            st.glowModality === 'h3k27ac'
              ? trk.h3k27acKo
              : st.glowModality === 'atac'
              ? trk.atacKo
              : trk.rnaKo;
          val = rV * (1 - currentSeverity) + kV * currentSeverity;
        }

        dummy.position.copy(tmpPt);
        dummy.quaternion.setFromUnitVectors(upVec, tmpTan);
        dummy.rotateX(Math.PI / 2);
        const flicker = 0.85 + 0.25 * Math.sin(tSec * 6.0 + i * 0.7);
        dummy.scale.setScalar(Math.max(0.22, val * 1.65 * flicker));
        dummy.updateMatrix();
        auraInstanced.setMatrixAt(i, dummy.matrix);

        if (Math.abs(u - shape.ltrU) < 0.06) {
          tmpCol
            .setHex(st.perturbMode === 'crispri_krab' ? 0x9333ea : 0xf43f5e)
            .lerp(new THREE.Color(0xfde047), val);
        } else if (u >= shape.tssU - 0.03 && u <= shape.tssU + 0.15) {
          tmpCol.setHex(0x10b981).lerp(new THREE.Color(0x6ee7b7), val);
        } else {
          tmpCol.setHex(0x0284c7).lerp(new THREE.Color(0x38bdf8), val);
        }
        auraInstanced.setColorAt(i, tmpCol);
      }
      auraInstanced.instanceMatrix.needsUpdate = true;
      if (auraInstanced.instanceColor)
        auraInstanced.instanceColor.needsUpdate = true;

      // Enhancer-Promoter Bridge Pulses
      for (let i = 0; i < bridgeOrbCount; i++) {
        if (currentSeverity > 0.75) {
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          bridgeOrbs.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const prog = (tSec * 0.85 + i / bridgeOrbCount) % 1.0;
        dummy.position.lerpVectors(ltrPos, tssPos, prog);
        dummy.position.y += Math.sin(prog * Math.PI) * 0.95;
        dummy.scale.setScalar(
          (1 - currentSeverity * 0.85) * (0.65 + 0.6 * Math.sin(prog * Math.PI))
        );
        dummy.updateMatrix();
        bridgeOrbs.setMatrixAt(i, dummy.matrix);
      }
      bridgeOrbs.instanceMatrix.needsUpdate = true;

      // Flowing Nascent mRNA Fountain
      const activeMrnaLimit = Math.max(
        4,
        Math.round(mrnaCount * activeRetention)
      );
      for (let i = 0; i < mrnaCount; i++) {
        if (i >= activeMrnaLimit) {
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          mrnaInstanced.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const seed = mrnaSeeds[i];
        const life = (tSec * seed.speed + seed.phase) % 1.0;
        const exonU = Math.min(
          0.9,
          shape.tssU + seed.exonOffset + life * 0.14
        );
        liveCurve.getPointAt(exonU, tmpPt);

        dummy.position.set(
          tmpPt.x + seed.driftX * life * 2.5,
          tmpPt.y + life * 5.0 * (0.35 + 0.65 * activeRetention),
          tmpPt.z + seed.driftZ * life * 2.5
        );
        dummy.rotation.set(tSec * 2 + i, tSec * 1.5, i);
        dummy.scale.setScalar(
          Math.sin(life * Math.PI) * (0.65 + 0.55 * activeRetention)
        );
        dummy.updateMatrix();
        mrnaInstanced.setMatrixAt(i, dummy.matrix);
      }
      mrnaInstanced.instanceMatrix.needsUpdate = true;

      // LTR Shatter Shards
      for (let i = 0; i < shardCount; i++) {
        if (st.shatterLtrTimer <= 0.01) {
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          ltrShards.setMatrixAt(i, dummy.matrix);
        } else {
          const burst = 1.0 - st.shatterLtrTimer;
          dummy.position.copy(ltrPos).addScaledVector(shardDirs[i], burst * 4.8);
          dummy.rotation.set(burst * 8 + i, burst * 6, i);
          dummy.scale.setScalar(st.shatterLtrTimer * 1.25);
          dummy.updateMatrix();
          ltrShards.setMatrixAt(i, dummy.matrix);
        }

        // Alu Control Shatter Shards
        if (st.shatterAluTimer <= 0.01) {
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          aluShards.setMatrixAt(i, dummy.matrix);
        } else {
          const burstA = 1.0 - st.shatterAluTimer;
          dummy.position
            .copy(aluPos)
            .addScaledVector(shardDirs[i], burstA * 4.2);
          dummy.rotation.set(burstA * 8 + i, burstA * 6, i);
          dummy.scale.setScalar(st.shatterAluTimer * 1.15);
          dummy.updateMatrix();
          aluShards.setMatrixAt(i, dummy.matrix);
        }
      }
      ltrShards.instanceMatrix.needsUpdate = true;
      aluShards.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1000;
      const h = container.clientHeight || 610;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const koRetention = Math.pow(2, metrics.rnaLog2FC);
  const currentRetentionPct = Math.round(
    (1.0 * (1 - effectiveSeverity) + koRetention * effectiveSeverity) * 100
  );
  const currentLoopOE = (
    metrics.loopScoreRef * (1 - effectiveSeverity) +
    metrics.loopScoreKo * effectiveSeverity
  ).toFixed(2);

  return (
    <section
      id="section-living-epigenetics"
      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-slate-100 shadow-2xl scroll-mt-20"
    >
      {/* Top Control Header: Camera Scale Fly-In + Epigenetic Modality Switcher */}
      <div className="px-5 py-3.5 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase text-rose-400 font-semibold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            3D Scale &amp; Camera Focus:
          </span>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setCameraFocus('macro_loop')}
              className={`px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                cameraFocus === 'macro_loop'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 100 kb Loop + 3D Hi-C Floor
            </button>
            <button
              type="button"
              onClick={() => setCameraFocus('viral_helix')}
              className={`px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                cameraFocus === 'viral_helix'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dna className="w-3.5 h-3.5" /> Zoom Inside Virus (3D Helix &amp; TF
              Docking)
            </button>
            <button
              type="button"
              onClick={() => setCameraFocus('pol2_hub')}
              className={`px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                cameraFocus === 'pol2_hub'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Zoom Into {locus.nearestGene}{' '}
              mRNA Factory
            </button>
          </div>
        </div>

        {/* Epigenetic Track Fire Modality */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setGlowModality('h3k27ac')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              glowModality === 'h3k27ac'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            H3K27ac Fire
          </button>
          <button
            type="button"
            onClick={() => setGlowModality('atac')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              glowModality === 'atac'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ATAC Chromatin
          </button>
          <button
            type="button"
            onClick={() => setGlowModality('rna')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              glowModality === 'rna'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RNA-seq Glow
          </button>
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div className="relative w-full h-[610px] select-none">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Top-Left Live AlphaGenome State Readout */}
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 pointer-events-none max-w-md space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-cyan-400 font-bold">
              {locus.repeatName} ({locus.familyClass}) → {locus.nearestGene}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
              mRNA Output: {currentRetentionPct}% · Hi-C O/E: {currentLoopOE}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {perturbMode === 'wt' &&
              `Intact Reference (WT): Transcription factor dimers dock inside the ${locus.repeatName} 3D double helix, tethering the cohesin loop above the glowing 3D AlphaGenome Hi-C contact mountain.`}
            {perturbMode === 'motif_snv' &&
              `1-bp TF Motif SNV: Mutating a single conserved nucleotide inside the ${locus.repeatName} double helix detaches the primary TF dimer, loosening the 3D loop and cutting mRNA output to ${currentRetentionPct}%.`}
            {perturbMode === 'crispri_krab' &&
              `CRISPRi (dCas9-KRAB): A violet heterochromatin repressor cage silences ${locus.repeatName} (H3K9me3) without cutting DNA, collapsing H3K27ac fire and ${locus.nearestGene} transcription.`}
            {perturbMode === 'delta_ltr' &&
              `Full ΔLTR Excision: Cas9 severs the ${locus.ltrLengthBp} bp viral switch into fragments. The loop unwinds from the Ghost WT Blueprint, the 3D Hi-C mountain flattens, and mRNA drops to ${currentRetentionPct}% (${metrics.rnaLog2FC.toFixed(2)} log2FC).`}
            {perturbMode === 'ctrl_alu' &&
              `Specificity Control (Δ${locus.controlRepeatRegion.repeatName}): Excising the nearby non-viral repeat shatters the yellow flank node, while the ${locus.repeatName} viral loop, Hi-C mountain, and ${locus.nearestGene} mRNA stream stay 100% intact!`}
          </p>
        </div>

        {/* Top-Right Legend */}
        <div className="hidden sm:block absolute top-4 right-4 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-[11px] font-mono text-slate-300 space-y-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>3D Viral Helix + TF Dimers ({locus.repeatName})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>{locus.nearestGene} Pol II &amp; mRNA Fountain</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>
              Matched Control ({locus.controlRepeatRegion.repeatName})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>3D AlphaGenome Hi-C Contact Floor</span>
          </div>
        </div>

        {/* Bottom Multi-Mode Interactive Perturbation Console */}
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 w-[min(1040px,96%)] bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-2.5 shadow-2xl">
          {/* 5 Perturbation Mode Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectPerturbMode('wt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  perturbMode === 'wt'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                1. Intact Virus (WT)
              </button>

              <button
                type="button"
                onClick={() => {
                  selectPerturbMode('motif_snv');
                  setCameraFocus('viral_helix');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  perturbMode === 'motif_snv'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" /> 2. 1-bp TF Motif SNV
              </button>

              <button
                type="button"
                onClick={() => selectPerturbMode('crispri_krab')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  perturbMode === 'crispri_krab'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> 3. dCas9-KRAB Silencing
              </button>

              <button
                type="button"
                onClick={() => selectPerturbMode('delta_ltr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  perturbMode === 'delta_ltr'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-rose-300'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" /> 4. Full ΔLTR Viral Cut
              </button>

              <button
                type="button"
                onClick={() => {
                  selectPerturbMode('ctrl_alu');
                  setCameraFocus('macro_loop');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  perturbMode === 'ctrl_alu'
                    ? 'bg-yellow-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                }`}
              >
                5. Cut {locus.controlRepeatRegion.repeatName} Control
              </button>
            </div>

            {/* Continuous Perturbation Dosage Slider + Ghost Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Perturbation Dosage:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={effectiveSeverity}
                  onChange={(e) => setCustomDosage(parseFloat(e.target.value))}
                  className="w-24 accent-rose-500 cursor-pointer"
                />
                <span className="text-white w-9">
                  {Math.round(effectiveSeverity * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGhostLoop((g) => !g)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                  showGhostLoop
                    ? 'bg-sky-950/80 border-sky-500/50 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Toggle Wild-Type Ghost Wireframe"
              >
                <Eye className="w-3.5 h-3.5" /> Ghost WT
              </button>

              <button
                type="button"
                onClick={() => setCameraFocus('macro_loop')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Reset 3D Camera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
