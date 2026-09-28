import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { useInView } from "framer-motion";
import { Component } from "react";

class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function MemoryNode({ node, position, onSelect }) {
  const mesh = useRef(null);
  const [hovered, setHovered] = useState(false);
  const color = node.current ? "#56d9e8" : node.status === "warning" ? "#ffb15e" : node.status === "success" ? "#61dfa2" : "#7daeb9";
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.15;
      const target = hovered ? 1.15 : 1;
      mesh.current.scale.lerp({ x: target, y: target, z: target }, 0.12);
    }
  });
  return <group position={position}>
    <mesh ref={mesh} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)} onClick={(event) => { event.stopPropagation(); onSelect(node); }}>
      <icosahedronGeometry args={[node.current ? 0.42 : 0.28, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.14} roughness={0.32} metalness={0.3} />
    </mesh>
    <Html center distanceFactor={10} position={[0, node.current ? -0.67 : -0.5, 0]} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
      <div className={`map-label ${node.current ? "map-label-current" : ""}`}>{node.label}</div>
      {hovered && <div className="map-tooltip"><strong>{node.label}</strong><span>{String(node.title || "").slice(0, 150)}</span></div>}
    </Html>
  </group>;
}

function Scene({ current, nodes, onSelect, active }) {
  const positions = useMemo(() => nodes.map((_, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 2.5 + (index % 2) * 0.45;
    return [Math.cos(angle) * radius, Math.sin(index * 1.7) * 0.9, Math.sin(angle) * radius];
  }), [nodes]);
  const drift = useRef();
  useFrame((state, delta) => {
    if (drift.current && active) {
      drift.current.rotation.y += delta * 0.025;
      drift.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.035;
    }
  });
  return <>
    <ambientLight intensity={0.7} /><pointLight position={[4, 3, 4]} intensity={18} color="#65e0ee" />
    <Stars radius={22} depth={8} count={260} factor={1.1} saturation={0} fade speed={0.15} />
    <group ref={drift}>
      {nodes.map((node, index) => <MemoryNode key={node.id} node={node} position={positions[index]} onSelect={onSelect} />)}
      {nodes.map((node, index) => <line key={`edge-${node.id}`}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, ...positions[index]]), 3]} /></bufferGeometry>
        <lineBasicMaterial color="#48aeba" transparent opacity={0.23} />
      </line>)}
      {current && <MemoryNode node={current} position={[0, 0, 0]} onSelect={onSelect} />}
    </group>
    <OrbitControls enablePan={false} minDistance={6} maxDistance={11} autoRotate autoRotateSpeed={0.18} enableDamping dampingFactor={0.08} />
  </>;
}

export default function MemoryMapCanvas({ current, nodes, onSelect }) {
  const root = useRef(null);
  const visible = useInView(root, { once: false, amount: 0.1 });
  const [contextFailed, setContextFailed] = useState(false);
  useEffect(() => {
    const element = root.current?.querySelector("canvas");
    if (!element) return;
    const onLost = (event) => { event.preventDefault(); setContextFailed(true); };
    element.addEventListener("webglcontextlost", onLost);
    return () => element.removeEventListener("webglcontextlost", onLost);
  }, []);
  if (contextFailed) return <div className="memory-map-empty">Interactive graphics are unavailable in this browser. The recalled memories remain available in the Memory section below.</div>;
  return <div className="memory-map-canvas" ref={root} aria-label="Interactive map of the current incident and recalled memories">
    <SceneErrorBoundary fallback={<div className="memory-map-fallback">{[current, ...nodes].filter(Boolean).map((node) => <div className="memory-map-node" key={node.id}><strong>{node.label}</strong><small>{node.content || node.title}</small></div>)}</div>}>
      <Canvas dpr={[1, 1.5]} frameloop={visible ? "always" : "never"} camera={{ position: [0, 0, 8], fov: 48 }} gl={{ antialias: false, powerPreference: "low-power" }}>
        <Scene current={current} nodes={nodes} onSelect={onSelect} active={visible} />
      </Canvas>
    </SceneErrorBoundary>
    <span className="memory-map-hint">Drag to explore · Select a node for evidence</span>
  </div>;
}
