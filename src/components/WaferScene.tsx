import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { dieMap } from "../lib/patterns";

const SIZE = 1024, N = 25;

function paint(ctx: CanvasRenderingContext2D, name: string) {
  ctx.fillStyle = "#0d0d13"; ctx.fillRect(0, 0, SIZE, SIZE);
  const s = SIZE / N;
  for (const d of dieMap(name, N).dies) {
    ctx.fillStyle = d.bad ? "#ff2e93" : "#1b1b25";
    ctx.fillRect(d.i * s + 3, d.j * s + 3, s - 6, s - 6);
    if (d.bad) { ctx.fillStyle = "#ffffff55"; ctx.fillRect(d.i * s + 6, d.j * s + 6, s - 12, 3); }
  }
}

/** Iridescent 3D wafer. The die map on its face follows `pattern`. The box takes the size its parent gives it. */
export default function WaferScene({ pattern, live }: { pattern: string; live?: React.RefObject<HTMLCanvasElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const repaint = useRef<(name: string) => void>(() => {});

  useEffect(() => {
    const art = box.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    art.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    const cv = document.createElement("canvas"); cv.width = cv.height = SIZE;
    const ctx = cv.getContext("2d")!;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    repaint.current = (name) => { paint(ctx, name); tex.needsUpdate = true; };
    repaint.current(pattern);

    const topMat = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.85, roughness: 0.18, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 900], clearcoat: 1 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xc9c9d4, metalness: 1, roughness: 0.2 });
    const wafer = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.12, 128), [sideMat, topMat, sideMat]);
    const haloGeo = new THREE.TorusGeometry(2.72, 0.016, 8, 180); haloGeo.rotateX(Math.PI / 2);
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0xc6ff3d }));
    const spin = new THREE.Group(); spin.add(wafer, halo);
    spin.rotation.set(Math.PI / 2.45, 0, 0.2);
    const group = new THREE.Group(); group.add(spin); scene.add(group);
    const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(3, 4, 5); scene.add(light);

    const size = () => {
      const w = art.clientWidth || 1, h = art.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.position.set(0, 0, 10.9 * Math.max(1, 1 / camera.aspect));
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size); ro.observe(art); size();

    let mx = 0, my = 0;
    const move = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", move);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = still ? 0 : clock.getElapsedTime();
      if (live?.current) { ctx.drawImage(live.current, 0, 0, SIZE, SIZE); tex.needsUpdate = true; }
      group.rotation.y += ((mx * 0.5) - group.rotation.y) * 0.05;
      group.rotation.x += ((my * 0.35) - group.rotation.x) * 0.05;
      wafer.rotation.y = t * 0.22;
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null); ro.disconnect(); window.removeEventListener("pointermove", move);
      renderer.dispose(); pm.dispose(); tex.dispose(); topMat.dispose(); sideMat.dispose();
      art.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { repaint.current(pattern); }, [pattern]);

  return <div className="art" ref={box} aria-hidden="true" />;
}
