"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOCK_TRANSACTIONS } from "@/lib/mock-data";
import {
    aggregateTransactionsByWeek,
    generateHeightMap,
    applyTerrainSmoothing,
    CATEGORY_COLORS,
} from "@/lib/terrain-utils";
import { useTerrainStore } from "@/stores/terrain-store";

interface FinancialTerrainProps {
    width?: number;
    depth?: number;
}

export function FinancialTerrain({ width = 64, depth = 32 }: FinancialTerrainProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const { currentDate, activeCategories, startDate, endDate } = useTerrainStore();

    // Generate terrain data based on current state
    const terrainData = useMemo(() => {
        // Filter transactions up to current date
        const filteredTransactions = MOCK_TRANSACTIONS.filter(
            t => new Date(t.date) <= currentDate
        );

        const dataPoints = aggregateTransactionsByWeek(
            filteredTransactions,
            startDate,
            new Date(Math.min(currentDate.getTime(), endDate.getTime())),
            activeCategories
        );

        const heightMap = generateHeightMap(dataPoints, width, depth);
        applyTerrainSmoothing(heightMap.heights, width, depth);

        return heightMap;
    }, [currentDate, activeCategories, startDate, endDate, width, depth]);

    // Create geometry with heights and colors
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(20, 10, width - 1, depth - 1);
        geo.rotateX(-Math.PI / 2); // Make it horizontal

        const positions = geo.attributes.position.array as Float32Array;
        const colors = new Float32Array(positions.length);

        // Apply heights and colors
        for (let i = 0; i < width * depth; i++) {
            const posIndex = i * 3;

            // Set height (Y in world space after rotation)
            positions[posIndex + 1] = terrainData.heights[i];

            // Set colors
            colors[posIndex] = terrainData.colors[i * 3];
            colors[posIndex + 1] = terrainData.colors[i * 3 + 1];
            colors[posIndex + 2] = terrainData.colors[i * 3 + 2];
        }

        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        return geo;
    }, [terrainData, width, depth]);

    // Gentle animation
    useFrame((state) => {
        if (meshRef.current) {
            // Subtle floating animation
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
        }
    });

    return (
        <group>
            {/* Main terrain */}
            <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
                <meshStandardMaterial
                    vertexColors
                    roughness={0.7}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Ground plane / grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[30, 20]} />
                <meshStandardMaterial
                    color="#1e293b"
                    opacity={0.5}
                    transparent
                />
            </mesh>

            {/* Grid lines */}
            <gridHelper
                args={[30, 30, "#27272a", "#27272a"]}
                position={[0, -0.49, 0]}
            />
        </group>
    );
}
