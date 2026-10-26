import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Layers,
  Search,
  Crosshair,
  RotateCw,
  Sun,
  Moon,
  Compass,
  Maximize2,
  Package,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  MapPin,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate, useRouter } from '../router';
import { useSocket } from '../hooks/useSocket';

// 8 Factory Zones Configuration with coordinates & colors
interface ZoneDefinition {
  id: string;
  name: string;
  shortName: string;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  color: string;
  hexColor: number;
  description: string;
  equipmentType: 'dock' | 'cutting' | 'stitching' | 'assembly' | 'quality' | 'packaging' | 'storage' | 'dispatch';
  checkpoints: { name: string; offsetX: number; offsetZ: number }[];
}

const ZONES_CONFIG: ZoneDefinition[] = [
  {
    id: 'raw-material',
    name: 'Raw Material Receiving',
    shortName: 'Receiving Dock',
    centerX: -38,
    centerZ: -20,
    width: 22,
    depth: 22,
    color: '#38bdf8',
    hexColor: 0x38bdf8,
    description: 'Incoming textile, synthetic substrates, and hardware inspection dock.',
    equipmentType: 'dock',
    checkpoints: [
      { name: 'Inward Dock Station', offsetX: -5, offsetZ: 0 },
      { name: 'Fabric & Trim Inspection', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'cutting',
    name: 'Cutting',
    shortName: 'CNC Cutting',
    centerX: -13,
    centerZ: -20,
    width: 22,
    depth: 22,
    color: '#f59e0b',
    hexColor: 0xf59e0b,
    description: 'Automated laser and mechanical pattern cutting floor.',
    equipmentType: 'cutting',
    checkpoints: [
      { name: 'CNC Automated Cutter', offsetX: -5, offsetZ: 0 },
      { name: 'Die Cut Table 1', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'stitching',
    name: 'Stitching',
    shortName: 'Seam Stitching',
    centerX: 13,
    centerZ: -20,
    width: 22,
    depth: 22,
    color: '#ec4899',
    hexColor: 0xec4899,
    description: 'Industrial heavy-duty joining and ultrasonic seam sealing.',
    equipmentType: 'stitching',
    checkpoints: [
      { name: 'Ultrasonic Seam Welder', offsetX: -5, offsetZ: 0 },
      { name: 'Heavy Duty Stitcher 2', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'assembly',
    name: 'Assembly',
    shortName: 'Component Assembly',
    centerX: 38,
    centerZ: -20,
    width: 22,
    depth: 22,
    color: '#8b5cf6',
    hexColor: 0x8b5cf6,
    description: 'Component integration, zipper installations, and internal dividers.',
    equipmentType: 'assembly',
    checkpoints: [
      { name: 'Sub-Assembly Station A', offsetX: -5, offsetZ: 0 },
      { name: 'Final Hardware Fitting', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'dispatch',
    name: 'Dispatch',
    shortName: 'Freight Dispatch',
    centerX: -38,
    centerZ: 20,
    width: 22,
    depth: 22,
    color: '#14b8a6',
    hexColor: 0x14b8a6,
    description: 'Outbound logistics, shipping documentation, and freight loading.',
    equipmentType: 'dispatch',
    checkpoints: [
      { name: 'Outbound Staging Area', offsetX: -5, offsetZ: 0 },
      { name: 'Carrier Loading Bay', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'finished-goods',
    name: 'Finished Goods',
    shortName: 'Finished Storage',
    centerX: -13,
    centerZ: 20,
    width: 22,
    depth: 22,
    color: '#10b981',
    hexColor: 0x10b981,
    description: 'Climate-controlled warehouse and automated pallet staging.',
    equipmentType: 'storage',
    checkpoints: [
      { name: 'Racking Bay 4', offsetX: -5, offsetZ: 0 },
      { name: 'Buffer Storage Area', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'packaging',
    name: 'Packaging',
    shortName: 'Packaging & RFID',
    centerX: 13,
    centerZ: 20,
    width: 22,
    depth: 22,
    color: '#eab308',
    hexColor: 0xeab308,
    description: 'Protective packaging, moisture inserts, and RFID verification.',
    equipmentType: 'packaging',
    checkpoints: [
      { name: 'Barcode & NFC Verification', offsetX: -5, offsetZ: 0 },
      { name: 'Polybag & Box Packing', offsetX: 5, offsetZ: 0 },
    ],
  },
  {
    id: 'quality-inspection',
    name: 'Quality Inspection',
    shortName: 'QA Lab & Testing',
    centerX: 38,
    centerZ: 20,
    width: 22,
    depth: 22,
    color: '#06b6d4',
    hexColor: 0x06b6d4,
    description: 'ISO-9001 dimensional compliance, seal integrity, and load tolerance tests.',
    equipmentType: 'quality',
    checkpoints: [
      { name: 'Dimensional & Seal Check', offsetX: -5, offsetZ: 0 },
      { name: 'Stress & Tensile Testing', offsetX: 5, offsetZ: 0 },
    ],
  },
];

// Status color mapping for 3D Pouch markers
const STATUS_COLORS: Record<string, { bg: string; hex: number }> = {
  Registered: { bg: '#3b82f6', hex: 0x3b82f6 },
  'Awaiting Processing': { bg: '#06b6d4', hex: 0x06b6d4 },
  'In Production': { bg: '#6366f1', hex: 0x6366f1 },
  'Quality Inspection': { bg: '#a855f7', hex: 0xa855f7 },
  Packaging: { bg: '#f59e0b', hex: 0xf59e0b },
  Completed: { bg: '#10b981', hex: 0x10b981 },
  Dispatched: { bg: '#14b8a6', hex: 0x14b8a6 },
  'On Hold': { bg: '#f97316', hex: 0xf97316 },
  Delayed: { bg: '#f43f5e', hex: 0xf43f5e },
};

// Canvas texture generator for 3D Zone billboards
function createZoneBillboardTexture(
  title: string,
  subtitle: string,
  pouchCount: number,
  themeColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  // Background rounded container
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 180, 24);
  ctx.fill();

  // Outer border with theme color
  ctx.lineWidth = 6;
  ctx.strokeStyle = themeColor;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 180, 24);
  ctx.stroke();

  // Top color accent bar
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.roundRect(20, 20, 472, 8, 4);
  ctx.fill();

  // Zone Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Inter, system-ui, sans-serif';
  ctx.fillText(title, 32, 75);

  // Subtitle / Department description
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Inter, system-ui, sans-serif';
  ctx.fillText(subtitle, 32, 115);

  // Active Pouch Count Pill
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.beginPath();
  ctx.roundRect(32, 135, 210, 40, 12);
  ctx.fill();
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(52, 155, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px Inter, system-ui, sans-serif';
  ctx.fillText(`${pouchCount} Pouch${pouchCount === 1 ? '' : 'es'} Active`, 68, 162);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const DigitalTwin: React.FC = () => {
  const { navigate } = useNavigate();
  const { queryParams } = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);

  // Application Data States
  const [pouches, setPouches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Telemetry State
  const [selectedPouch, setSelectedPouch] = useState<any | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLocating, setIsLocating] = useState(false);

  // Responsive Controls (Mobile vs Desktop)
  const [viewPreset, setViewPreset] = useState<'isometric' | 'topdown' | 'aisle'>('isometric');
  const [darkMode, setDarkMode] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [desktopPanelCollapsed, setDesktopPanelCollapsed] = useState(false);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Mesh Mapping Refs for Instant 3D Raycasting & Locating
  const pouchMeshesMap = useRef<Map<string, THREE.Group>>(new Map());
  const zoneMeshesMap = useRef<Map<string, THREE.Group>>(new Map());
  const locatorBeaconRef = useRef<THREE.Group | null>(null);

  // Camera Target Animation Ref
  const cameraLerpTargetRef = useRef<{
    active: boolean;
    camPos: THREE.Vector3;
    lookAt: THREE.Vector3;
    progress: number;
  }>({
    active: false,
    camPos: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    progress: 0,
  });

  // Load Pouches and Departments Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pouchesRes, deptsRes] = await Promise.all([
        api.getPouches({ limit: 200 }),
        api.getDepartments(true),
      ]);

      if (pouchesRes.success) {
        setPouches(pouchesRes.pouches);
      }
      if (deptsRes.success) {
        setDepartments(deptsRes.departments);
      }
    } catch (err) {
      console.error('Failed to load Digital Twin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Socket.IO Updates
  useSocket((event) => {
    if (event === 'movement:recorded' || event === 'dashboard:update') {
      loadData();
    }
  });

  // Smoothly Fly Camera to Target Coordinate
  const flyCameraTo = useCallback((x: number, y: number, z: number, offsetDist = 28) => {
    if (!cameraRef.current || !controlsRef.current) return;

    setIsLocating(true);

    const targetLookAt = new THREE.Vector3(x, y, z);
    const targetCamPos = new THREE.Vector3(
      x + offsetDist * 0.7,
      y + offsetDist * 0.85,
      z + offsetDist * 0.7
    );

    cameraLerpTargetRef.current = {
      active: true,
      camPos: targetCamPos,
      lookAt: targetLookAt,
      progress: 0,
    };

    // Update locator beacon 3D position
    if (locatorBeaconRef.current) {
      locatorBeaconRef.current.position.set(x, 0.1, z);
      locatorBeaconRef.current.visible = true;
    }
  }, []);

  // Locate Specific Pouch by Object or Serial
  const locatePouch = useCallback(
    (pouch: any) => {
      setSelectedPouch(pouch);
      setSelectedZone(null);
      setShowDrawer(true);
      setMobileSearchOpen(false);

      const pouchMesh = pouchMeshesMap.current.get(pouch.serialNumber);
      if (pouchMesh) {
        flyCameraTo(pouchMesh.position.x, pouchMesh.position.y, pouchMesh.position.z, 20);
      } else {
        // Fallback: estimate from department
        const targetZone = ZONES_CONFIG.find(
          (z) => z.name.toLowerCase() === pouch.currentDepartment?.name?.toLowerCase()
        ) || ZONES_CONFIG[0];
        flyCameraTo(targetZone.centerX, 2, targetZone.centerZ, 24);
      }
    },
    [flyCameraTo]
  );

  // Locate Specific Factory Zone
  const locateZone = useCallback(
    (zone: ZoneDefinition) => {
      setSelectedZone(zone);
      setSelectedPouch(null);
      setShowDrawer(true);
      setMobileSearchOpen(false);
      flyCameraTo(zone.centerX, 1, zone.centerZ, 32);
    },
    [flyCameraTo]
  );

  // Reset Camera to Master Overview
  const resetCamera = useCallback(() => {
    flyCameraTo(0, 0, 0, 85);
    setSelectedPouch(null);
    setSelectedZone(null);
    setShowDrawer(false);
    if (locatorBeaconRef.current) {
      locatorBeaconRef.current.visible = false;
    }
  }, [flyCameraTo]);

  // Handle URL deep-linking on initial data load
  useEffect(() => {
    if (!loading && pouches.length > 0) {
      const locateQuery = queryParams.locate;
      const zoneQuery = queryParams.zone;

      if (locateQuery) {
        const found = pouches.find(
          (p) =>
            p.serialNumber.toLowerCase() === locateQuery.toLowerCase() ||
            p.id.toLowerCase() === locateQuery.toLowerCase()
        );
        if (found) {
          locatePouch(found);
          return;
        }
      }

      if (zoneQuery) {
        const foundZone = ZONES_CONFIG.find(
          (z) =>
            z.name.toLowerCase().includes(zoneQuery.toLowerCase()) ||
            z.shortName.toLowerCase().includes(zoneQuery.toLowerCase())
        );
        if (foundZone) {
          locateZone(foundZone);
        }
      }
    }
  }, [loading, pouches, queryParams, locatePouch, locateZone]);

  // Set Camera View Presets
  const setPresetView = (preset: 'isometric' | 'topdown' | 'aisle') => {
    setViewPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'isometric') {
      flyCameraTo(0, 0, 0, 80);
    } else if (preset === 'topdown') {
      cameraLerpTargetRef.current = {
        active: true,
        camPos: new THREE.Vector3(0, 95, 0.1),
        lookAt: new THREE.Vector3(0, 0, 0),
        progress: 0,
      };
    } else if (preset === 'aisle') {
      cameraLerpTargetRef.current = {
        active: true,
        camPos: new THREE.Vector3(-55, 6, 0),
        lookAt: new THREE.Vector3(55, 4, 0),
        progress: 0,
      };
    }
  };

  // Three.js Scene Setup & Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x090d16 : 0xf1f5f9);
    scene.fog = new THREE.FogExp2(darkMode ? 0x090d16 : 0xf1f5f9, 0.007);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(45, 60, 65);
    cameraRef.current = camera;

    // 3. Renderer with Touch Optimization
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none'; // Critical for native mobile touch
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls (Multi-touch support for Mobile)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor
    controls.minDistance = 6;
    controls.maxDistance = 140;
    controls.target.set(0, 2, 0);

    // Multi-touch gestures
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(darkMode ? 0x475569 : 0xffffff, darkMode ? 1.4 : 1.1);
    scene.add(ambientLight);

    const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, darkMode ? 1.8 : 1.4);
    mainDirectionalLight.position.set(40, 70, 30);
    mainDirectionalLight.castShadow = true;
    mainDirectionalLight.shadow.mapSize.width = 1024;
    mainDirectionalLight.shadow.mapSize.height = 1024;
    mainDirectionalLight.shadow.camera.near = 10;
    mainDirectionalLight.shadow.camera.far = 180;
    mainDirectionalLight.shadow.camera.left = -60;
    mainDirectionalLight.shadow.camera.right = 60;
    mainDirectionalLight.shadow.camera.top = 50;
    mainDirectionalLight.shadow.camera.bottom = -50;
    scene.add(mainDirectionalLight);

    const blueFillLight = new THREE.DirectionalLight(0x38bdf8, darkMode ? 0.9 : 0.4);
    blueFillLight.position.set(-50, 40, -40);
    scene.add(blueFillLight);

    // 6. Polished Factory Floor Grid & Slab
    const floorGeometry = new THREE.BoxGeometry(110, 1.5, 75);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: darkMode ? 0x0f172a : 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.75;
    floor.receiveShadow = true;
    scene.add(floor);

    // Visual Grid Lines
    const grid = new THREE.GridHelper(110, 55, darkMode ? 0x334155 : 0x94a3b8, darkMode ? 0x1e293b : 0xcbd5e1);
    grid.position.y = 0.02;
    scene.add(grid);

    // Central Factory Logistics Highway
    const highwayGeo = new THREE.PlaneGeometry(106, 9);
    const highwayMat = new THREE.MeshBasicMaterial({
      color: darkMode ? 0x1e293b : 0xd1d5db,
      side: THREE.DoubleSide,
    });
    const highway = new THREE.Mesh(highwayGeo, highwayMat);
    highway.rotation.x = -Math.PI / 2;
    highway.position.set(0, 0.04, 0);
    scene.add(highway);

    // Outer Safety Perimeter Yellow Lines
    const safetyLineGeo = new THREE.PlaneGeometry(106, 0.35);
    const safetyLineMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const safetyLineNorth = new THREE.Mesh(safetyLineGeo, safetyLineMat);
    safetyLineNorth.rotation.x = -Math.PI / 2;
    safetyLineNorth.position.set(0, 0.05, -4.5);
    scene.add(safetyLineNorth);

    const safetyLineSouth = new THREE.Mesh(safetyLineGeo, safetyLineMat);
    safetyLineSouth.rotation.x = -Math.PI / 2;
    safetyLineSouth.position.set(0, 0.05, 4.5);
    scene.add(safetyLineSouth);

    // 7. Render 8 Dedicated Factory Zones with Realistic 3D Equipment
    zoneMeshesMap.current.clear();

    ZONES_CONFIG.forEach((zone) => {
      const zoneGroup = new THREE.Group();
      zoneGroup.position.set(zone.centerX, 0, zone.centerZ);
      zoneGroup.name = `zone_${zone.id}`;

      // Zone Floor Boundary Pad
      const padGeo = new THREE.PlaneGeometry(zone.width, zone.depth);
      const padMat = new THREE.MeshStandardMaterial({
        color: darkMode ? 0x111c33 : 0xffffff,
        roughness: 0.4,
        metalness: 0.1,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.03;
      pad.receiveShadow = true;
      zoneGroup.add(pad);

      // Glowing Perimeter Boundary Line
      const borderGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-zone.width / 2, 0.05, -zone.depth / 2),
        new THREE.Vector3(zone.width / 2, 0.05, -zone.depth / 2),
        new THREE.Vector3(zone.width / 2, 0.05, zone.depth / 2),
        new THREE.Vector3(-zone.width / 2, 0.05, zone.depth / 2),
        new THREE.Vector3(-zone.width / 2, 0.05, -zone.depth / 2),
      ]);
      const borderMat = new THREE.LineBasicMaterial({
        color: zone.hexColor,
        linewidth: 2,
      });
      const borderLine = new THREE.Line(borderGeo, borderMat);
      zoneGroup.add(borderLine);

      // 3D Equipment Generation by Zone Type
      if (zone.equipmentType === 'dock') {
        for (let i = -1; i <= 1; i++) {
          const pallet = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.6, 4),
            new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 })
          );
          pallet.position.set(i * 6, 0.3, -3);
          pallet.castShadow = true;
          zoneGroup.add(pallet);

          const cargo = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 2.8, 3.5),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
          );
          cargo.position.set(i * 6, 2, -3);
          cargo.castShadow = true;
          zoneGroup.add(cargo);
        }
      } else if (zone.equipmentType === 'cutting') {
        for (let i = -1; i <= 1; i += 2) {
          const table = new THREE.Mesh(
            new THREE.BoxGeometry(7, 1.8, 5.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
          );
          table.position.set(i * 5, 0.9, -2);
          table.castShadow = true;
          zoneGroup.add(table);

          const gantry = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 3, 5.8),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6 })
          );
          gantry.position.set(i * 5, 2.4, -2);
          zoneGroup.add(gantry);

          const laser = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2.2),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
          );
          laser.position.set(i * 5, 1.9, -2);
          zoneGroup.add(laser);
        }
      } else if (zone.equipmentType === 'stitching') {
        for (let i = -1; i <= 1; i += 2) {
          const bench = new THREE.Mesh(
            new THREE.BoxGeometry(6, 1.6, 4),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 })
          );
          bench.position.set(i * 5.5, 0.8, -2);
          zoneGroup.add(bench);

          const stitchHead = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.8, 2),
            new THREE.MeshStandardMaterial({ color: 0xec4899 })
          );
          stitchHead.position.set(i * 5.5 - 1.5, 2.4, -2);
          zoneGroup.add(stitchHead);
        }
      } else if (zone.equipmentType === 'assembly') {
        const table = new THREE.Mesh(
          new THREE.BoxGeometry(14, 1.6, 4.5),
          new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5 })
        );
        table.position.set(0, 0.8, -2);
        zoneGroup.add(table);

        const rack = new THREE.Mesh(
          new THREE.BoxGeometry(13.6, 2.5, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        rack.position.set(0, 2.8, -4);
        zoneGroup.add(rack);
      } else if (zone.equipmentType === 'quality') {
        const testChamber = new THREE.Mesh(
          new THREE.BoxGeometry(7, 4.5, 5),
          new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75, roughness: 0.1 })
        );
        testChamber.position.set(-4, 2.25, 2);
        zoneGroup.add(testChamber);

        const scannerLaser = new THREE.Mesh(
          new THREE.PlaneGeometry(6, 4),
          new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        scannerLaser.rotation.y = Math.PI / 4;
        scannerLaser.position.set(-4, 2.25, 2);
        zoneGroup.add(scannerLaser);
      } else if (zone.equipmentType === 'packaging') {
        const conveyor = new THREE.Mesh(
          new THREE.BoxGeometry(15, 1.4, 3.2),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
        );
        conveyor.position.set(0, 0.7, 2);
        zoneGroup.add(conveyor);

        const gateArch = new THREE.Mesh(
          new THREE.TorusGeometry(2.4, 0.25, 12, 24, Math.PI),
          new THREE.MeshBasicMaterial({ color: 0xeab308 })
        );
        gateArch.position.set(0, 1.4, 2);
        gateArch.rotation.y = Math.PI / 2;
        zoneGroup.add(gateArch);
      } else if (zone.equipmentType === 'storage') {
        for (let row = -1; row <= 1; row += 2) {
          const rackFrame = new THREE.Mesh(
            new THREE.BoxGeometry(14, 6.5, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x10b981, wireframe: true })
          );
          rackFrame.position.set(0, 3.25, row * 4);
          zoneGroup.add(rackFrame);

          for (let col = -2; col <= 2; col++) {
            for (let tier = 0; tier < 3; tier++) {
              const box = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1.6, 2),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
              );
              box.position.set(col * 2.8, 0.8 + tier * 2.1, row * 4);
              zoneGroup.add(box);
            }
          }
        }
      } else if (zone.equipmentType === 'dispatch') {
        const bayRamp = new THREE.Mesh(
          new THREE.BoxGeometry(14, 1.2, 5),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
        );
        bayRamp.position.set(0, 0.6, 3);
        zoneGroup.add(bayRamp);

        const rollerShutter = new THREE.Mesh(
          new THREE.BoxGeometry(13, 5, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x14b8a6, metalness: 0.7 })
        );
        rollerShutter.position.set(0, 3, 5.8);
        zoneGroup.add(rollerShutter);
      }

      // Checkpoint Sensor Pedestals / Towers
      zone.checkpoints.forEach((cp) => {
        const cpTower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.45, 3.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
        );
        cpTower.position.set(cp.offsetX, 1.6, cp.offsetZ);
        zoneGroup.add(cpTower);

        const beaconCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 16),
          new THREE.MeshBasicMaterial({ color: zone.hexColor })
        );
        beaconCap.position.set(cp.offsetX, 3.3, cp.offsetZ);
        zoneGroup.add(beaconCap);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1.1, 24),
          new THREE.MeshBasicMaterial({ color: zone.hexColor, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(cp.offsetX, 0.05, cp.offsetZ);
        zoneGroup.add(ring);
      });

      // 3D Billboard Signage Floating over the Zone
      const zonePouchCount = pouches.filter(
        (p) => p.currentDepartment?.name?.toLowerCase() === zone.name.toLowerCase()
      ).length;

      const billboardTexture = createZoneBillboardTexture(
        zone.shortName,
        zone.name,
        zonePouchCount,
        zone.color
      );
      const billboardGeo = new THREE.PlaneGeometry(10, 3.8);
      const billboardMat = new THREE.MeshBasicMaterial({
        map: billboardTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const billboard = new THREE.Mesh(billboardGeo, billboardMat);
      billboard.position.set(0, 8.5, 0);
      zoneGroup.add(billboard);

      scene.add(zoneGroup);
      zoneMeshesMap.current.set(zone.name, zoneGroup);
    });

    // 8. 3D Locator Laser Beacon & Expanding Rings
    const locatorGroup = new THREE.Group();
    locatorGroup.visible = false;

    const laserCylinderGeo = new THREE.CylinderGeometry(0.3, 0.3, 24, 16);
    const laserCylinderMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    const laserCylinder = new THREE.Mesh(laserCylinderGeo, laserCylinderMat);
    laserCylinder.position.y = 12;
    locatorGroup.add(laserCylinder);

    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ring1.rotation.x = -Math.PI / 2;
    locatorGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(3.0, 3.6, 32),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ring2.rotation.x = -Math.PI / 2;
    locatorGroup.add(ring2);

    const reticleGeo = new THREE.OctahedronGeometry(1.2, 0);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.y = 5.5;
    locatorGroup.add(reticle);

    scene.add(locatorGroup);
    locatorBeaconRef.current = locatorGroup;

    // 9. Handle Window Resizing cleanly
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 10. Click / Tap Raycasting for 3D Viewport
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerUp = (event: PointerEvent) => {
      // Don't trigger if user was dragging/panning
      if (!renderer?.domElement) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check intersections with pouches first
      const pouchGroupList = Array.from(pouchMeshesMap.current.values());
      const pouchIntersects = raycaster.intersectObjects(pouchGroupList, true);

      if (pouchIntersects.length > 0) {
        let parent: THREE.Object3D | null = pouchIntersects[0].object;
        while (parent && !parent.name.startsWith('pouch_')) {
          parent = parent.parent;
        }

        if (parent) {
          const serial = parent.name.replace('pouch_', '');
          const matched = pouches.find((p) => p.serialNumber === serial);
          if (matched) {
            locatePouch(matched);
            return;
          }
        }
      }

      // Check intersections with zone pads
      const zoneGroupList = Array.from(zoneMeshesMap.current.values());
      const zoneIntersects = raycaster.intersectObjects(zoneGroupList, true);

      if (zoneIntersects.length > 0) {
        let parent: THREE.Object3D | null = zoneIntersects[0].object;
        while (parent && !parent.name.startsWith('zone_')) {
          parent = parent.parent;
        }

        if (parent) {
          const zoneId = parent.name.replace('zone_', '');
          const matchedZone = ZONES_CONFIG.find((z) => z.id === zoneId);
          if (matchedZone) {
            locateZone(matchedZone);
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // 11. Main 60fps Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Camera Fly-To Interpolation
      if (cameraLerpTargetRef.current.active) {
        cameraLerpTargetRef.current.progress += delta * 1.8;
        camera.position.lerp(cameraLerpTargetRef.current.camPos, 0.08);
        controls.target.lerp(cameraLerpTargetRef.current.lookAt, 0.08);

        if (cameraLerpTargetRef.current.progress >= 1.2) {
          cameraLerpTargetRef.current.active = false;
          setIsLocating(false);
        }
      }

      controls.update();

      // Animate Locator Beacon
      if (locatorBeaconRef.current && locatorBeaconRef.current.visible) {
        reticle.rotation.y += delta * 1.5;
        reticle.rotation.x += delta * 0.8;
        reticle.position.y = 5.2 + Math.sin(elapsed * 4) * 0.5;

        ring1.scale.setScalar(1 + Math.sin(elapsed * 5) * 0.2);
        ring2.scale.setScalar(1 + Math.cos(elapsed * 3) * 0.3);
      }

      // Animate Pouches Hovering
      let pouchIdx = 0;
      pouchMeshesMap.current.forEach((meshGroup) => {
        meshGroup.position.y = 0.9 + Math.sin(elapsed * 3 + pouchIdx) * 0.25;
        meshGroup.rotation.y += delta * 0.7;
        pouchIdx++;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, [darkMode, pouches, locatePouch, locateZone]);

  // Sync Pouches 3D Meshes onto the Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    pouchMeshesMap.current.forEach((mesh) => {
      scene.remove(mesh);
    });
    pouchMeshesMap.current.clear();

    const deptsCount: Record<string, number> = {};

    pouches.forEach((pouch) => {
      const deptName = pouch.currentDepartment?.name || 'Raw Material Receiving';
      const zone =
        ZONES_CONFIG.find((z) => z.name.toLowerCase() === deptName.toLowerCase()) ||
        ZONES_CONFIG[0];

      deptsCount[deptName] = (deptsCount[deptName] || 0) + 1;
      const countInZone = deptsCount[deptName];

      const angle = (countInZone * 1.1) % (Math.PI * 2);
      const radius = 2.5 + ((countInZone * 1.7) % 6.5);
      const posX = zone.centerX + Math.cos(angle) * radius;
      const posZ = zone.centerZ + Math.sin(angle) * radius;

      const pouchGroup = new THREE.Group();
      pouchGroup.position.set(posX, 1.0, posZ);
      pouchGroup.name = `pouch_${pouch.serialNumber}`;

      const statusColor = STATUS_COLORS[pouch.status]?.hex || 0x3b82f6;

      const bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 0.6);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        roughness: 0.3,
        metalness: 0.6,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      pouchGroup.add(body);

      const tagRing = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.38, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      tagRing.position.z = 0.31;
      pouchGroup.add(tagRing);

      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({
          color: pouch.tagProgrammed ? 0x10b981 : 0xf59e0b,
        })
      );
      led.position.set(0.6, 0.4, 0.32);
      pouchGroup.add(led);

      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.8, 16),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = -0.95;
      pouchGroup.add(shadowDisc);

      scene.add(pouchGroup);
      pouchMeshesMap.current.set(pouch.serialNumber, pouchGroup);
    });
  }, [pouches]);

  // Filtered pouches list for search
  const filteredPouches = pouches.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.currentDepartment?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative w-full h-[calc(100dvh-8rem)] sm:h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xl flex flex-col select-none touch-none">
      {/* 1. Top HUD Control Bar - Responsive Mobile Header */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          {/* Title Badge */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg flex items-center space-x-2 text-white">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs tracking-tight">3D Twin</span>
              <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full">
                {pouches.length} P
              </span>
            </div>
          </div>

          {/* Camera Presets & Toggles */}
          <div className="pointer-events-auto flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg text-white">
            <button
              onClick={() => setPresetView('isometric')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                viewPreset === 'isometric'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Isometric 3D"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="text-[11px]">3D</span>
            </button>

            <button
              onClick={() => setPresetView('topdown')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                viewPreset === 'topdown'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Top-Down Plan"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Plan</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Day/Night"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={resetCamera}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Zone Pills for 1-Tap Locating */}
        <div className="pointer-events-auto flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {ZONES_CONFIG.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            return (
              <button
                key={zone.id}
                onClick={() => locateZone(zone)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 flex-shrink-0 shadow-sm ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-blue-500/30 ring-1 ring-white/50'
                    : 'bg-slate-900/85 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                <span>{zone.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Desktop-Only Left Floating Search Panel (Hidden on Mobile) */}
      <div className="hidden md:flex absolute top-24 left-3 z-20 w-76 max-h-[calc(100vh-14rem)] flex-col bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden pointer-events-auto">
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Locate Pouch</span>
            <span className="text-[10px] text-blue-400 font-mono">{filteredPouches.length} items</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial / batch..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-[11px] text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses ({pouches.length})</option>
            <option value="In Production">In Production</option>
            <option value="Quality Inspection">Quality Inspection</option>
            <option value="Packaging">Packaging</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1 space-y-0.5">
          {filteredPouches.map((pouch) => {
            const isSelected = selectedPouch?.serialNumber === pouch.serialNumber;
            const statusCfg = STATUS_COLORS[pouch.status] || { bg: '#3b82f6' };

            return (
              <div
                key={pouch.id}
                onClick={() => locatePouch(pouch)}
                className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : 'hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusCfg.bg }}
                  />
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs text-white block truncate">
                      {pouch.serialNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {pouch.currentDepartment?.name || 'Raw Material'}
                    </span>
                  </div>
                </div>
                <Crosshair className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Mobile Floating Action Button: Search & Locate Sheet Trigger */}
      <div className="md:hidden absolute bottom-4 right-3 z-20 pointer-events-auto">
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center space-x-2 font-semibold text-xs border border-blue-400/30 active:scale-95 transition-transform"
        >
          <Search className="w-4 h-4" />
          <span>Locate Pouch ({pouches.length})</span>
        </button>
      </div>

      {/* 4. Mobile Slide-Up Search Bottom Sheet */}
      {mobileSearchOpen && (
        <div className="md:hidden absolute inset-x-0 bottom-0 z-30 bg-slate-900/98 backdrop-blur-lg border-t border-slate-700 rounded-t-3xl p-4 space-y-3 max-h-[70vh] flex flex-col pointer-events-auto animate-slide-up shadow-2xl">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Select Pouch to Fly Camera
              </span>
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial / batch / zone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 space-y-1">
            {filteredPouches.map((pouch) => {
              const statusCfg = STATUS_COLORS[pouch.status] || { bg: '#3b82f6' };
              return (
                <div
                  key={pouch.id}
                  onClick={() => locatePouch(pouch)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-blue-600/20 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: statusCfg.bg }}
                    />
                    <div>
                      <div className="font-mono font-bold text-xs text-white">
                        {pouch.serialNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pouch.currentDepartment?.name} &bull; {pouch.batchNumber}
                      </div>
                    </div>
                  </div>
                  <Crosshair className="w-4 h-4 text-blue-400" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Responsive Telemetry Card / Drawer */}
      {/* On Desktop: Right Slide-Over; On Mobile: Bottom Docked Sheet */}
      {showDrawer && (selectedPouch || selectedZone) && (
        <div className="absolute z-25 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl p-4 text-white
          md:top-24 md:right-3 md:w-80 md:rounded-2xl md:max-h-[calc(100vh-14rem)] md:overflow-y-auto
          inset-x-2.5 bottom-2.5 rounded-2xl animate-slide-up"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {selectedPouch ? '3D Target Telemetry' : 'Zone Telemetry'}
              </span>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedPouch && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-mono font-black text-white">
                    {selectedPouch.serialNumber}
                  </div>
                  <div className="text-[11px] text-slate-400">{selectedPouch.pouchType}</div>
                </div>
                <StatusBadge status={selectedPouch.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Zone</span>
                  <span className="font-semibold text-white truncate block">
                    {selectedPouch.currentDepartment?.name || 'Raw Material'}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Checkpoint</span>
                  <span className="font-semibold text-white truncate block">
                    {selectedPouch.currentCheckpoint?.name || 'Intake Dock'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => navigate(`/pouches/${selectedPouch.id}`)}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => navigate('/scan')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Scan</span>
                </button>
              </div>
            </div>
          )}

          {selectedZone && !selectedPouch && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedZone.color }}
                />
                <h3 className="text-base font-bold text-white">{selectedZone.name}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {selectedZone.description}
              </p>
              <div className="p-2 bg-slate-800/80 rounded-lg text-xs flex justify-between items-center">
                <span className="text-slate-300">Active Checkpoints</span>
                <span className="font-mono text-emerald-400">{selectedZone.checkpoints.length} Stations Online</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Hardware-Accelerated WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
};
