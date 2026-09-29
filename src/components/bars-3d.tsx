import { useEffect, useRef } from "react";

type Props = { array: number[]; compare?: number[] | null | undefined; write?: number[] | null | undefined; sorted: number[] };

/** Orbitable 3D bar chart of a single sort step. Drag to rotate. */
export function Bars3D({ array, compare, write, sorted }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((p: Props) => void) | null>(null);
  const latest = useRef<Props>({ array, compare, write, sorted });
  latest.current = { array, compare, write, sorted };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};
    import("three").then((THREE) => {
      if (disposed) return;
      const cvs = document.createElement("canvas");
      cvs.width = cvs.height = 1;
      const ctx2 = cvs.getContext("2d", { willReadFrequently: true });
      const cssColor = (v: string) => {
        const p = document.createElement("div");
        p.style.color = `var(${v})`;
        document.body.appendChild(p);
        const computed = getComputedStyle(p).color;
        p.remove();
        if (!ctx2) return new THREE.Color(1, 1, 1);
        ctx2.clearRect(0, 0, 1, 1);
        ctx2.fillStyle = computed;
        ctx2.fillRect(0, 0, 1, 1);
        const d = ctx2.getImageData(0, 0, 1, 1).data;
        return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
      };
      const C = {
        base: cssColor("--neon-cyan"),
        cmp: cssColor("--neon-amber"),
        wr: cssColor("--neon-pink"),
        ok: cssColor("--neon-lime"),
      };
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dl = new THREE.DirectionalLight(0xffffff, 1.4);
      dl.position.set(10, 20, 15);
      scene.add(dl);
      const grid = new THREE.GridHelper(80, 40, C.base, C.base);
      (grid.material as InstanceType<typeof THREE.Material>).opacity = 0.15;
      (grid.material as InstanceType<typeof THREE.Material>).transparent = true;
      scene.add(grid);

      let mesh: InstanceType<typeof THREE.InstancedMesh> | null = null;
      const dummy = new THREE.Object3D();
      const heights: number[] = [];
      let target: Props = latest.current;
      let n = 0;
      const build = (count: number) => {
        if (mesh) { scene.remove(mesh); mesh.dispose(); }
        mesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.8, 1, 0.8),
          new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.4, emissive: 0x111122 }),
          count,
        );
        scene.add(mesh);
        n = count;
        heights.length = 0;
        for (let i = 0; i < count; i++) heights.push(0.01);
      };
      api.current = (p) => { target = p; if (p.array.length !== n) build(p.array.length); };
      api.current(target);

      const size = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(el);

      let yaw = 0.6, pitch = 0.45, drag = false, lx = 0, ly = 0, auto = true;
      const down = (e: PointerEvent) => { drag = true; auto = false; lx = e.clientX; ly = e.clientY; };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        yaw -= (e.clientX - lx) * 0.008;
        pitch = Math.min(1.3, Math.max(0.05, pitch + (e.clientY - ly) * 0.006));
        lx = e.clientX; ly = e.clientY;
      };
      const up = () => { drag = false; };
      renderer.domElement.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);

      let raf = 0;
      const tick = () => {
        if (mesh) {
          const max = Math.max(...target.array, 1);
          for (let i = 0; i < n; i++) {
            const h = (target.array[i] / max) * 14 + 0.1;
            heights[i] += (h - heights[i]) * 0.3;
            dummy.position.set((i - n / 2) * 1.05, heights[i] / 2, 0);
            dummy.scale.set(1, heights[i], 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            const c = target.write?.includes(i) ? C.wr
              : target.compare?.includes(i) ? C.cmp
              : target.sorted.includes(i) ? C.ok : C.base;
            mesh.setColorAt(i, c);
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        if (auto) yaw += 0.003;
        const r = Math.max(28, n * 1.1);
        camera.position.set(Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r + 4, Math.cos(yaw) * Math.cos(pitch) * r);
        camera.lookAt(0, 5, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        renderer.dispose();
        renderer.domElement.remove();
        api.current = null;
      };
    });
    return () => { disposed = true; cleanup(); };
  }, []);

  useEffect(() => { api.current?.({ array, compare, write, sorted }); }, [array, compare, write, sorted]);

  return <div ref={host} className="h-80 w-full cursor-grab rounded-xl bg-muted/20 active:cursor-grabbing" title="Drag to rotate" />;
}
