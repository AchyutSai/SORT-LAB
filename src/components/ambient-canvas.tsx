import { useEffect, useRef } from "react";

/** 3D ambient background: glowing star field, floating wireframe shapes and a wavy bar grid. */
export function AmbientCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      const css = getComputedStyle(document.documentElement);
      const col = (v: string, fb: string) => {
        const c = new THREE.Color();
        try {
          const probe = document.createElement("div");
          probe.style.color = css.getPropertyValue(v).trim() || fb;
          document.body.appendChild(probe);
          const rgb = getComputedStyle(probe).color;
          probe.remove();
          const m = rgb.match(/[\d.]+/g);
          if (m && rgb.startsWith("rgb")) c.setRGB(+m[0] / 255, +m[1] / 255, +m[2] / 255);
          else c.set(fb);
        } catch {
          c.set(fb);
        }
        return c;
      };
      const cyan = col("--neon-cyan", "#35e0f0");
      const violet = col("--neon-violet", "#8a7bff");
      const pink = col("--neon-pink", "#ff5fa8");

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.02);
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.set(0, 4, 26);

      // Star field
      const N = 900;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 120;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(
        sg,
        new THREE.PointsMaterial({ color: cyan, size: 0.18, transparent: true, opacity: 0.8 }),
      );
      scene.add(stars);

      // Floating wireframe shapes
      const geos = [
        new THREE.IcosahedronGeometry(2.2, 1),
        new THREE.TorusKnotGeometry(1.4, 0.4, 90, 12),
        new THREE.OctahedronGeometry(2),
        new THREE.TorusGeometry(1.8, 0.5, 12, 40),
      ];
      const shapes: InstanceType<typeof THREE.Mesh>[] = [];
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Mesh(
          geos[i % geos.length],
          new THREE.MeshBasicMaterial({
            color: [cyan, violet, pink][i % 3],
            wireframe: true,
            transparent: true,
            opacity: 0.35,
          }),
        );
        m.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.3) * 20, -Math.random() * 30 - 4);
        m.userData = { s: Math.random() * 0.5 + 0.2, o: Math.random() * 6 };
        shapes.push(m);
        scene.add(m);
      }

      // Wavy "sorting bars" grid floor
      const G = 26;
      const bars = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.7, 1, 0.7),
        new THREE.MeshBasicMaterial({ color: violet, transparent: true, opacity: 0.28, wireframe: true }),
        G * G,
      );
      bars.position.set(0, -9, -14);
      scene.add(bars);
      const dummy = new THREE.Object3D();

      let mx = 0, my = 0;
      const onMove = (e: PointerEvent) => {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
      };
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("resize", onResize);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        const t = clock.getElapsedTime() * (reduce ? 0.1 : 1);
        stars.rotation.y = t * 0.02;
        for (const s of shapes) {
          s.rotation.x = t * s.userData["s"];
          s.rotation.y = t * s.userData["s"] * 0.7;
          s.position.y += Math.sin(t + s.userData["o"]) * 0.004;
        }
        let k = 0;
        for (let x = 0; x < G; x++)
          for (let z = 0; z < G; z++) {
            const h = 1 + 2.5 * (Math.sin(x * 0.35 + t) * Math.cos(z * 0.35 + t * 0.8) + 1);
            dummy.position.set((x - G / 2) * 1.4, h / 2, (z - G / 2) * 1.4);
            dummy.scale.set(1, h, 1);
            dummy.updateMatrix();
            bars.setMatrixAt(k++, dummy.matrix);
          }
        bars.instanceMatrix.needsUpdate = true;
        camera.position.x += (mx * 6 - camera.position.x) * 0.03;
        camera.position.y += (4 - my * 4 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, -10);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-80" />;
}
