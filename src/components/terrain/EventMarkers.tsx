"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { useTerrainStore } from "@/stores/terrain-store";
import { useFinancialData } from "@/hooks/useFinancialData";

interface EventMarkersProps {
    terrainWidth?: number;
}

export function EventMarkers({ terrainWidth = 20 }: EventMarkersProps) {
    const { currentDate, activeCategories } = useTerrainStore();
    const { transactions, isConnected } = useFinancialData();

    // Find significant events
    const markers = useMemo(() => {
        const events: Array<{
            id: string;
            type: "income" | "expense" | "milestone";
            position: [number, number, number];
            amount: number;
            label: string;
            color: string;
        }> = [];

        // Filter transactions up to current date
        const relevantTransactions = (!isConnected || transactions.length === 0) ? [] : transactions.filter(t => {
            const date = new Date(t.date);
            return date <= currentDate && activeCategories.has(t.category);
        });

        // Find large expenses (>$500)
        relevantTransactions
            .filter(t => t.amount > 500)
            .slice(0, 10) // Limit markers
            .forEach((t, i) => {
                const date = new Date(t.date);
                const startDate = new Date("2025-01-01");
                const endDate = new Date("2026-02-01");
                const progress = (date.getTime() - startDate.getTime()) /
                    (endDate.getTime() - startDate.getTime());

                const x = (progress - 0.5) * terrainWidth;
                const z = (Math.random() - 0.5) * 4;
                const y = 1.5 + Math.random() * 0.5;

                events.push({
                    id: t.id || `expense-${i}`,
                    type: "expense",
                    position: [x, y, z],
                    amount: t.amount,
                    label: t.merchant_name || t.name || t.category,
                    color: "#FF6B6B",
                });
            });

        // Add milestone markers at specific balance thresholds
        const milestonePositions = [
            { threshold: 10000, x: -5, label: "$10K Balance" },
            { threshold: 15000, x: 0, label: "$15K Balance" },
            { threshold: 20000, x: 5, label: "$20K Balance" },
        ];

        milestonePositions.forEach((m, i) => {
            events.push({
                id: `milestone-${m.threshold}`,
                type: "milestone",
                position: [m.x, 2.5, 0],
                amount: m.threshold,
                label: m.label,
                color: "#FFD700",
            });
        });

        return events;
    }, [currentDate, activeCategories, terrainWidth]);

    return (
        <group>
            {markers.map((marker) => (
                <EventMarker key={marker.id} {...marker} />
            ))}
        </group>
    );
}

interface EventMarkerProps {
    type: "income" | "expense" | "milestone";
    position: [number, number, number];
    amount: number;
    label: string;
    color: string;
}

function EventMarker({ type, position, amount, label, color }: EventMarkerProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Gentle bobbing animation
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;

            // Slow rotation for non-milestone markers
            if (type !== "milestone") {
                meshRef.current.rotation.y += 0.01;
            }
        }
    });

    return (
        <group position={position}>
            {type === "milestone" ? (
                // Trophy shape for milestones
                <mesh ref={meshRef}>
                    <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
                    <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                </mesh>
            ) : type === "expense" ? (
                // Flag for expenses
                <group ref={meshRef}>
                    {/* Pole */}
                    <mesh position={[0, -0.3, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
                        <meshStandardMaterial color="#666" />
                    </mesh>
                    {/* Flag */}
                    <mesh position={[0.15, 0, 0]}>
                        <planeGeometry args={[0.3, 0.2]} />
                        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            ) : (
                // Coin for income
                <mesh ref={meshRef}>
                    <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
                    <meshStandardMaterial color="#34D399" metalness={0.6} roughness={0.3} />
                </mesh>
            )}

            {/* Label */}
            <Billboard position={[0, 0.5, 0]}>
                <Text
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="black"
                >
                    {label}
                </Text>
                <Text
                    fontSize={0.1}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    position={[0, -0.2, 0]}
                >
                    ${amount.toLocaleString()}
                </Text>
            </Billboard>
        </group>
    );
}
