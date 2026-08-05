"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Convert lat/lng to 3D position on sphere
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Sample visitor locations (will be replaced with real data)
const DEMO_VISITORS = [
  { lat: 48.86, lng: 2.35, label: "Paris" },
  { lat: 40.71, lng: -74.01, label: "New York" },
  { lat: 51.51, lng: -0.13, label: "London" },
  { lat: 35.68, lng: 139.69, label: "Tokyo" },
  { lat: -33.87, lng: 151.21, label: "Sydney" },
  { lat: 55.75, lng: 37.62, label: "Moscow" },
  { lat: 1.35, lng: 103.82, label: "Singapore" },
  { lat: -23.55, lng: -46.63, label: "São Paulo" },
  { lat: 37.77, lng: -122.42, label: "San Francisco" },
  { lat: 52.52, lng: 13.41, label: "Berlin" },
  { lat: 34.05, lng: -118.24, label: "Los Angeles" },
  { lat: 19.43, lng: -99.13, label: "Mexico City" },
  { lat: 28.61, lng: 77.21, label: "New Delhi" },
  { lat: 31.23, lng: 121.47, label: "Shanghai" },
  { lat: 33.59, lng: -7.62, label: "Casablanca" },
  { lat: 45.76, lng: 4.84, label: "Lyon" },
  { lat: 43.30, lng: 5.37, label: "Marseille" },
  { lat: 41.39, lng: 2.17, label: "Barcelona" },
];

// Create globe wireframe geometry (dots on a sphere)
function GlobeDots({ radius = 2 }: { radius?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const DOT_COUNT = 6000;

    for (let i = 0; i < DOT_COUNT; i++) {
      // Fibonacci sphere for even distribution
      const y = 1 - (i / (DOT_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = ((1 + Math.sqrt(5)) / 2) * i * Math.PI * 2;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Only keep points that roughly match land masses (simplified)
      const lat = Math.asin(y) * (180 / Math.PI);
      const lng = Math.atan2(z, x) * (180 / Math.PI);

      if (isLand(lat, lng)) {
        positions.push(x * radius, y * radius, z * radius);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }, [radius]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#1e3a5f"
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.6}
      />
    </points>
  );
}

// Simplified land detection (checks major continents)
function isLand(lat: number, lng: number): boolean {
  // North America
  if (lat > 15 && lat < 72 && lng > -170 && lng < -50) return true;
  // South America
  if (lat > -56 && lat < 15 && lng > -82 && lng < -34) return true;
  // Europe
  if (lat > 35 && lat < 72 && lng > -12 && lng < 45) return true;
  // Africa
  if (lat > -35 && lat < 38 && lng > -18 && lng < 52) return true;
  // Asia
  if (lat > 5 && lat < 75 && lng > 45 && lng < 180) return true;
  // Southeast Asia / Indonesia
  if (lat > -11 && lat < 20 && lng > 95 && lng < 145) return true;
  // Australia
  if (lat > -45 && lat < -10 && lng > 112 && lng < 155) return true;
  // Japan
  if (lat > 30 && lat < 46 && lng > 128 && lng < 146) return true;
  // Middle East
  if (lat > 12 && lat < 42 && lng > 35 && lng < 65) return true;

  return false;
}

// Visitor dots (glowing animated points)
function VisitorDots({
  radius = 2,
  visitors,
}: {
  radius?: number;
  visitors: { lat: number; lng: number }[];
}) {
  const ref = useRef<THREE.Group>(null);
  const [pulsePhases] = useState(() =>
    visitors.map(() => Math.random() * Math.PI * 2)
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    ref.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const scale = 1 + Math.sin(t * 2 + pulsePhases[i]) * 0.4;
        child.scale.setScalar(scale);
        if (child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = 0.6 + Math.sin(t * 2 + pulsePhases[i]) * 0.4;
        }
      }
    });
  });

  return (
    <group ref={ref}>
      {visitors.map((v, i) => {
        const pos = latLngToVec3(v.lat, v.lng, radius + 0.02);
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial
              color="#00e5ff"
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Animated arcs between visitors
function Arcs({
  radius = 2,
  visitors,
}: {
  radius?: number;
  visitors: { lat: number; lng: number }[];
}) {
  const ref = useRef<THREE.Group>(null);

  const arcs = useMemo(() => {
    const result: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    // Create arcs from first few visitors to Paris (center)
    const paris = latLngToVec3(48.86, 2.35, radius);
    for (let i = 1; i < Math.min(visitors.length, 8); i++) {
      const start = latLngToVec3(visitors[i].lat, visitors[i].lng, radius);
      result.push({ start, end: paris });
    }
    return result;
  }, [visitors, radius]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    ref.current.children.forEach((child, i) => {
      if (child instanceof THREE.Line) {
        if (child.material instanceof THREE.LineBasicMaterial) {
          child.material.opacity =
            0.15 + Math.sin(t * 1.5 + i * 0.7) * 0.15;
        }
      }
    });
  });

  const lines = useMemo(() => {
    return arcs.map((arc) => {
      const mid = new THREE.Vector3()
        .addVectors(arc.start, arc.end)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(radius * 1.3);

      const curve = new THREE.QuadraticBezierCurve3(arc.start, mid, arc.end);
      const points = curve.getPoints(40);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: "#00e5ff",
        transparent: true,
        opacity: 0.2,
      });
      return new THREE.Line(geometry, material);
    });
  }, [arcs, radius]);

  return (
    <group ref={ref}>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// Glow ring around globe
function GlowRing({ radius = 2 }: { radius?: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current && ref.current.material instanceof THREE.MeshBasicMaterial) {
      ref.current.material.opacity =
        0.04 + Math.sin(clock.getElapsedTime() * 0.5) * 0.02;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.01, radius * 1.15, 64]} />
      <meshBasicMaterial
        color="#00e5ff"
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Main rotating globe group
function GlobeScene({
  visitors,
  autoRotate = true,
}: {
  visitors: { lat: number; lng: number }[];
  autoRotate?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.3, -0.5, 0.1]}>
      {/* Globe wireframe outline */}
      <mesh>
        <sphereGeometry args={[2, 48, 48]} />
        <meshBasicMaterial
          color="#0a1628"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Globe edge glow */}
      <mesh>
        <sphereGeometry args={[2.005, 48, 48]} />
        <meshBasicMaterial
          color="#1a3050"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Land dots */}
      <GlobeDots radius={2.01} />

      {/* Visitor locations */}
      <VisitorDots radius={2} visitors={visitors} />

      {/* Connection arcs */}
      <Arcs radius={2} visitors={visitors} />

      {/* Glow ring */}
      <GlowRing radius={2} />
    </group>
  );
}

// Exported component
export function Globe({
  className = "",
  visitors,
}: {
  className?: string;
  visitors?: { lat: number; lng: number; label?: string }[];
}) {
  const [mounted, setMounted] = useState(false);
  const activeVisitors = visitors || DEMO_VISITORS;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="h-16 w-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <GlobeScene visitors={activeVisitors} />
      </Canvas>
    </div>
  );
}
