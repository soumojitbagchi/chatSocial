import * as React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface GrassCanvasProps {
  className?: string;
  windSpeed?: number;
  bladeCount?: number;
}

export function GrassCanvas({
  className = "",
  windSpeed = 1.0,
  bladeCount = 18000,
}: GrassCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth || window.innerWidth || 1, 1);
    const height = Math.max(container.clientHeight || window.innerHeight || 1, 1);

    // --- Three.js Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05080a");
    scene.fog = new THREE.FogExp2("#05080a", 0.03);

    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      100
    );
    camera.position.set(0, 3.2, 14);
    camera.lookAt(0, 1.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn("WebGL initialization failed in GrassCanvas:", err);
      return;
    }
    // --- 1. Custom Instanced Grass Geometry & Shader ---
    const BLADE_WIDTH = 0.085;
    const BLADE_HEIGHT = 1.6;
    const BLADE_JOINTS = 4;

    const baseGeometry = new THREE.PlaneGeometry(
      BLADE_WIDTH,
      BLADE_HEIGHT,
      1,
      BLADE_JOINTS
    );
    baseGeometry.translate(0, BLADE_HEIGHT / 2, 0);

    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.index = baseGeometry.index;
    instancedGeometry.attributes.position = baseGeometry.attributes.position;
    instancedGeometry.attributes.uv = baseGeometry.attributes.uv;

    const FIELD_RADIUS = 18;
    const offsets = new Float32Array(bladeCount * 3);
    const orientations = new Float32Array(bladeCount * 4);
    const scales = new Float32Array(bladeCount * 3);

    const tempQuat = new THREE.Quaternion();
    const tempEuler = new THREE.Euler();

    for (let i = 0; i < bladeCount; i++) {
      const r = Math.sqrt(Math.random()) * FIELD_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta) - 2.0;
      const y = (Math.sin(x * 0.2) + Math.cos(z * 0.2)) * 0.3;

      offsets[i * 3 + 0] = x;
      offsets[i * 3 + 1] = y;
      offsets[i * 3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      tempEuler.set(0, angle, (Math.random() - 0.5) * 0.2);
      tempQuat.setFromEuler(tempEuler);

      orientations[i * 4 + 0] = tempQuat.x;
      orientations[i * 4 + 1] = tempQuat.y;
      orientations[i * 4 + 2] = tempQuat.z;
      orientations[i * 4 + 3] = tempQuat.w;

      const scaleX = 0.7 + Math.random() * 0.6;
      const scaleY = 0.8 + Math.random() * 0.7;
      const scaleZ = 0.7 + Math.random() * 0.6;
      scales[i * 3 + 0] = scaleX;
      scales[i * 3 + 1] = scaleY;
      scales[i * 3 + 2] = scaleZ;
    }

    instancedGeometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(offsets, 3)
    );
    instancedGeometry.setAttribute(
      "orientation",
      new THREE.InstancedBufferAttribute(orientations, 4)
    );
    instancedGeometry.setAttribute(
      "scale",
      new THREE.InstancedBufferAttribute(scales, 3)
    );

    const grassUniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: windSpeed },
      uMousePos: { value: new THREE.Vector3(0, -100, 0) },
      uColorBase: { value: new THREE.Color("#04251a") },
      uColorMid: { value: new THREE.Color("#10b981") },
      uColorTip: { value: new THREE.Color("#6ee7b7") },
      uColorHighlight: { value: new THREE.Color("#a7f3d0") },
    };

    const grassVertexShader = `
      precision highp float;

      attribute vec3 offset;
      attribute vec4 orientation;
      attribute vec3 scale;

      uniform float uTime;
      uniform float uWindSpeed;
      uniform vec3 uMousePos;

      varying vec2 vUv;
      varying float vHeightPercent;
      varying float vShadow;

      vec3 applyQuaternion(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
      }

      void main() {
        vUv = uv;
        vHeightPercent = uv.y;

        vec3 transformed = position * scale;
        transformed.x *= mix(1.0, 0.2, uv.y);
        transformed = applyQuaternion(transformed, orientation);

        vec3 worldBase = offset;

        // Multi-frequency natural wind wave
        float windWave1 = sin(uTime * 1.8 * uWindSpeed + worldBase.x * 0.45 + worldBase.z * 0.35);
        float windWave2 = cos(uTime * 2.6 * uWindSpeed + worldBase.x * 0.8 - worldBase.z * 0.6);
        float combinedWind = (windWave1 * 0.7 + windWave2 * 0.3);

        float bendFactor = uv.y * uv.y;
        transformed.x += combinedWind * 0.45 * bendFactor;
        transformed.z += combinedWind * 0.35 * bendFactor;

        // Ultra-Subtle, Organic Mouse Micro-Interaction
        vec3 totalWorldPos = worldBase + transformed;
        float distToMouse = distance(totalWorldPos.xz, uMousePos.xz);
        float mouseRadius = 2.0;
        if (distToMouse < mouseRadius) {
          float pushIntensity = smoothstep(mouseRadius, 0.0, distToMouse);
          float pushForce = pushIntensity * 0.06 * bendFactor;
          vec2 pushDir = normalize(totalWorldPos.xz - uMousePos.xz + 0.001);
          transformed.x += pushDir.x * pushForce;
          transformed.z += pushDir.y * pushForce;
        }

        transformed.y -= abs(combinedWind) * 0.12 * bendFactor;

        vec4 worldPosition = vec4(worldBase + transformed, 1.0);
        vShadow = clamp(worldPosition.y * 0.5 + 0.5, 0.2, 1.0);

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;

    const grassFragmentShader = `
      precision highp float;

      uniform vec3 uColorBase;
      uniform vec3 uColorMid;
      uniform vec3 uColorTip;
      uniform vec3 uColorHighlight;

      varying vec2 vUv;
      varying float vHeightPercent;
      varying float vShadow;

      void main() {
        vec3 col = mix(uColorBase, uColorMid, smoothstep(0.0, 0.45, vHeightPercent));
        col = mix(col, uColorTip, smoothstep(0.45, 0.85, vHeightPercent));
        col = mix(col, uColorHighlight, smoothstep(0.85, 1.0, vHeightPercent));

        col *= vShadow;
        col += vec3(0.02, 0.05, 0.04) * (1.0 - vUv.x * vUv.x);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const grassMaterial = new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: grassUniforms,
      side: THREE.DoubleSide,
    });

    const grassMesh = new THREE.Mesh(instancedGeometry, grassMaterial);
    scene.add(grassMesh);

    // --- 2. Dense Night Sky Stars & Sprinkle Dots ---
    const STAR_COUNT = 2400;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starScales = new Float32Array(STAR_COUNT);
    const starTwinkleSpeeds = new Float32Array(STAR_COUNT);
    const starOffsets = new Float32Array(STAR_COUNT);

    const palette = [
      [1.0, 1.0, 1.0],       // Diamond white
      [0.7, 0.95, 1.0],      // Ice cyan
      [0.55, 0.95, 0.75],    // Ethereal emerald
      [1.0, 0.95, 0.8],      // Warm starlight
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      const x = (Math.random() - 0.5) * 55;
      const y = 1.4 + Math.random() * 24;
      const z = -28 + Math.random() * 32;

      starPositions[i * 3 + 0] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3 + 0] = col[0];
      starColors[i * 3 + 1] = col[1];
      starColors[i * 3 + 2] = col[2];

      starScales[i] = 1.0 + Math.random() * 2.8;
      starTwinkleSpeeds[i] = 1.2 + Math.random() * 3.5;
      starOffsets[i] = Math.random() * Math.PI * 2;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute("scale", new THREE.BufferAttribute(starScales, 1));
    starGeometry.setAttribute("twinkleSpeed", new THREE.BufferAttribute(starTwinkleSpeeds, 1));
    starGeometry.setAttribute("twinkleOffset", new THREE.BufferAttribute(starOffsets, 1));

    const starUniforms = {
      uTime: { value: 0 },
    };

    const starVertexShader = `
      attribute float scale;
      attribute float twinkleSpeed;
      attribute float twinkleOffset;
      attribute vec3 color;

      uniform float uTime;

      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        vColor = color;
        vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
        
        float twinkle = sin(uTime * twinkleSpeed + twinkleOffset);
        float brightness = 0.45 + 0.55 * (twinkle * 0.5 + 0.5);
        vAlpha = brightness;

        gl_PointSize = scale * (36.0 / -mvPosition.z) * (0.6 + 0.4 * brightness);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const starFragmentShader = `
      precision highp float;

      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 1.4);

        gl_FragColor = vec4(vColor, vAlpha * intensity * 0.95);
      }
    `;

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: starUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- 3. Floating Ethereal Fireflies / Motes ---
    const MOTES_COUNT = 160;
    const motePositions = new Float32Array(MOTES_COUNT * 3);

    for (let i = 0; i < MOTES_COUNT; i++) {
      motePositions[i * 3 + 0] = (Math.random() - 0.5) * 26;
      motePositions[i * 3 + 1] = 0.6 + Math.random() * 4.0;
      motePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    const moteGeometry = new THREE.BufferGeometry();
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));

    const moteMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("#34d399"),
      size: 0.14,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const motes = new THREE.Points(moteGeometry, moteMaterial);
    scene.add(motes);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#020507"),
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // --- Interactive Mouse & Cursor Parallax ---
    const mouse = new THREE.Vector2(0, 0);
    const targetCameraPos = new THREE.Vector3(0, 3.2, 14);
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const mouseWorldPos = new THREE.Vector3();
    const targetMouseWorldPos = new THREE.Vector3(0, -100, 0);
    const currentMouseWorldPos = new THREE.Vector3(0, -100, 0);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.set(x, y);

      // Ultra-gentle subtle camera parallax
      targetCameraPos.x = x * 0.25;
      targetCameraPos.y = 3.2 + y * 0.12;

      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(groundPlane, mouseWorldPos)) {
        targetMouseWorldPos.copy(mouseWorldPos);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);
        mouse.set(x, y);
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(groundPlane, mouseWorldPos)) {
          targetMouseWorldPos.copy(mouseWorldPos);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = Math.max(container.clientWidth || window.innerWidth || 1, 1);
      const h = Math.max(container.clientHeight || window.innerHeight || 1, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      grassUniforms.uTime.value = elapsedTime;
      starUniforms.uTime.value = elapsedTime;

      // Floating motes
      const posAttr = moteGeometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      for (let i = 0; i < MOTES_COUNT; i++) {
        posArray[i * 3 + 0] += Math.sin(elapsedTime * 0.8 + i) * 0.003;
        posArray[i * 3 + 1] += Math.cos(elapsedTime * 0.5 + i) * 0.002;
        posArray[i * 3 + 2] += Math.sin(elapsedTime * 0.6 + i) * 0.003;
      }
      posAttr.needsUpdate = true;

      // Smoothly glide mouse interaction point across grass
      currentMouseWorldPos.lerp(targetMouseWorldPos, 0.08);
      grassUniforms.uMousePos.value.copy(currentMouseWorldPos);

      // Smooth camera damping
      camera.position.lerp(targetCameraPos, 0.035);
      camera.lookAt(0, 1.2, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      baseGeometry.dispose();
      instancedGeometry.dispose();
      grassMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      moteGeometry.dispose();
      moteMaterial.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
    };
  }, [windSpeed, bladeCount]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ touchAction: "none" }}
    />
  );
}

export default GrassCanvas;
