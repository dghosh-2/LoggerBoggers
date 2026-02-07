"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TerrainParticlesProps {
    count?: number;
}

export function TerrainParticles({ count = 200 }: TerrainParticlesProps) {
    const particlesRef = useRef<THREE.Points>(null);

    // Generate particle positions
    const { positions, colors, velocities } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Random positions around the terrain
            positions[i3] = (Math.random() - 0.5) * 25;
            positions[i3 + 1] = Math.random() * 5;
            positions[i3 + 2] = (Math.random() - 0.5) * 15;

            // Color based on type (green for income, red for expense, blue for savings)
            const type = Math.random();
            if (type < 0.33) {
                // Income - Green
                colors[i3] = 0.204;
                colors[i3 + 1] = 0.827;
                colors[i3 + 2] = 0.6;
                velocities[i3 + 1] = 0.02 + Math.random() * 0.02; // Move up
            } else if (type < 0.66) {
                // Expense - Coral
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.42;
                colors[i3 + 2] = 0.42;
                velocities[i3 + 1] = -(0.01 + Math.random() * 0.02); // Move down
            } else {
                // Savings - Blue
                colors[i3] = 0.376;
                colors[i3 + 1] = 0.647;
                colors[i3 + 2] = 0.98;
                velocities[i3] = 0.01 + Math.random() * 0.01; // Move forward
                velocities[i3 + 1] = 0.005;
            }

            // Add slight random drift
            velocities[i3] += (Math.random() - 0.5) * 0.005;
            velocities[i3 + 2] += (Math.random() - 0.5) * 0.005;
        }

        return { positions, colors, velocities };
    }, [count]);

    // Animate particles
    useFrame(() => {
        if (!particlesRef.current) return;

        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Apply velocity
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];

            // Reset particles that go too far
            if (positions[i3 + 1] > 6 || positions[i3 + 1] < -1) {
                positions[i3] = (Math.random() - 0.5) * 25;
                positions[i3 + 1] = Math.random() * 3;
                positions[i3 + 2] = (Math.random() - 0.5) * 15;
            }

            // Wrap around horizontally
            if (positions[i3] > 15) positions[i3] = -15;
            if (positions[i3] < -15) positions[i3] = 15;
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.08}
                vertexColors
                transparent
                opacity={0.7}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}
