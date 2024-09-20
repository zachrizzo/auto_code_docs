// src/components/threeJS/NeuralParticleCloud.js

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const NeuralParticleCloud = ({ particleCount = 1000, connectionCount = 5000 }) => {
    const particlesRef = useRef();
    const connectionsRef = useRef();

    // Generate initial particle positions, velocities, and colors
    const particlesData = useMemo(() => {
        const positions = [];
        const velocities = [];
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            // Random positions within a sphere
            const theta = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(360));
            const phi = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(360));
            const radius = THREE.MathUtils.randFloat(2, 5);
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(theta);
            positions.push(x, y, z);

            // Assign random velocities for movement
            const velocity = new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(0.001),
                THREE.MathUtils.randFloatSpread(0.001),
                THREE.MathUtils.randFloatSpread(0.001)
            );
            velocities.push(velocity);

            // Dark-themed colors (cool tones with slight variation)
            color.setHSL(0.6 + THREE.MathUtils.randFloatSpread(0.05), 1.0, 0.3);
            colors.push(color.r, color.g, color.b);
        }

        return {
            positions: new Float32Array(positions),
            velocities,
            colors: new Float32Array(colors),
        };
    }, [particleCount]);

    // Generate connections based on initial particle positions
    const connectionsData = useMemo(() => {
        const connectionPositions = [];
        const connectionColors = [];
        const color = new THREE.Color();

        for (let i = 0; i < connectionCount; i++) {
            const a = THREE.MathUtils.randInt(0, particleCount - 1);
            const b = THREE.MathUtils.randInt(0, particleCount - 1);

            // Avoid connecting a particle to itself
            if (a === b) continue;

            // Get positions of particle a
            const ax = particlesData.positions[a * 3];
            const ay = particlesData.positions[a * 3 + 1];
            const az = particlesData.positions[a * 3 + 2];

            // Get positions of particle b
            const bx = particlesData.positions[b * 3];
            const by = particlesData.positions[b * 3 + 1];
            const bz = particlesData.positions[b * 3 + 2];

            // Push both endpoints for the line segment
            connectionPositions.push(ax, ay, az, bx, by, bz);

            // Connection color (matching the particles with slight variation)
            color.setHSL(0.6 + THREE.MathUtils.randFloatSpread(0.05), 1.0, 0.3);
            connectionColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }

        return {
            positions: new Float32Array(connectionPositions),
            colors: new Float32Array(connectionColors),
        };
    }, [particleCount, connectionCount, particlesData.positions]);

    // Animation loop
    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime();

        // Animate particles
        const positions = particlesRef.current.geometry.attributes.position.array;
        particlesData.velocities.forEach((velocity, i) => {
            let ix = i * 3;
            positions[ix] += velocity.x;
            positions[ix + 1] += velocity.y;
            positions[ix + 2] += velocity.z;

            // Boundary conditions to keep particles within the sphere
            const x = positions[ix];
            const y = positions[ix + 1];
            const z = positions[ix + 2];
            const distance = Math.sqrt(x * x + y * y + z * z);
            if (distance > 5) {
                velocity.negate(); // Reverse direction
            }

            // Optional: Add slight oscillation for liveliness
            positions[ix] += Math.sin(time + i) * 0.0005;
            positions[ix + 1] += Math.cos(time + i) * 0.0005;
            positions[ix + 2] += Math.sin(time + i) * 0.0005;
        });
        particlesRef.current.geometry.attributes.position.needsUpdate = true;

        // Animate connections
        if (connectionsRef.current) {
            const connectionArray = connectionsRef.current.geometry.attributes.color.array;

            for (let i = 0; i < connectionCount * 6; i += 6) {
                // Pulsate brightness based on time and connection index
                const brightness = (Math.sin(time * 2 + i) * 0.5 + 0.5) * 1.5; // Amplify brightness

                // Clamp brightness to [0,1]
                const clampedBrightness = THREE.MathUtils.clamp(brightness, 0, 1);

                connectionArray[i] = 0.6 * clampedBrightness; // R
                connectionArray[i + 1] = 1.0 * clampedBrightness; // G
                connectionArray[i + 2] = 1.0 * clampedBrightness; // B

                connectionArray[i + 3] = 0.6 * clampedBrightness; // R
                connectionArray[i + 4] = 1.0 * clampedBrightness; // G
                connectionArray[i + 5] = 1.0 * clampedBrightness; // B
            }

            connectionsRef.current.geometry.attributes.color.needsUpdate = true;
        }
    });

    return (
        <>
            {/* Particles */}
            <Points
                ref={particlesRef}
                positions={particlesData.positions}
                stride={3}
                frustumCulled={false}
            >
                <PointMaterial
                    transparent
                    vertexColors
                    size={0.05}
                    sizeAttenuation
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Points>

            {/* Connections */}
            <lineSegments
                ref={connectionsRef}
                geometry={useMemo(() => {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(connectionsData.positions, 3));
                    geometry.setAttribute('color', new THREE.BufferAttribute(connectionsData.colors, 3));
                    return geometry;
                }, [connectionsData.positions, connectionsData.colors])}
            >
                <lineBasicMaterial
                    vertexColors
                    transparent
                    linewidth={1}
                    blending={THREE.AdditiveBlending}
                />
            </lineSegments>
        </>
    );
};

export default NeuralParticleCloud;
