// src/components/threeJS/FractalLightDisplay.js

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshPhysicalMaterial, PointLightHelper, SpotLightHelper } from 'three';

const FractalLightDisplay = () => {
    const prismRef = useRef();
    const lightRefs = useRef([]);

    // Rotate the prism for a dynamic effect
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        prismRef.current.rotation.y = t * 0.1;
    });

    // Optional: Add rotation or animation to lights if desired
    // useFrame(() => { /* Animate lights */ });

    return (
        <>
            {/* Colored Light Sources */}
            <spotLight
                ref={(el) => (lightRefs.current[0] = el)}
                position={[-5, 5, 5]}
                angle={0.3}
                penumbra={1}
                intensity={2}
                color="#ff0000" // Red light
                castShadow
            />
            <spotLight
                ref={(el) => (lightRefs.current[1] = el)}
                position={[5, 5, -5]}
                angle={0.3}
                penumbra={1}
                intensity={20}
                color="#0000ff" // Blue light
                castShadow
            />
            <spotLight
                ref={(el) => (lightRefs.current[2] = el)}
                position={[5, -5, 5]}
                angle={0.3}
                penumbra={1}
                intensity={20}
                color="#00ff00" // Green light
                castShadow
            />

            {/* Optional: Visual Helpers for Lights */}
            {/* Uncomment to visualize light positions */}
            {/* <SpotLightHelper args={[lightRefs.current[0], 1]} />
            <SpotLightHelper args={[lightRefs.current[1], 1]} />
            <SpotLightHelper args={[lightRefs.current[2], 1]} /> */}

            {/* Glass Prism */}
            <mesh ref={prismRef} position={[0, 0, 0]}>
                <icosahedronGeometry args={[3, 0]} />
                <meshPhysicalMaterial
                    color="#ffffff" // Neutral color to let lights show through
                    metalness={0}
                    roughness={0.05}
                    transmission={1} // High transparency
                    thickness={1.2}
                    envMapIntensity={0} // Disable environment reflections
                    clearcoat={0.5}
                    clearcoatRoughness={0.2}
                    ior={1.45}
                    attenuationDistance={10}
                    attenuationColor="#ffffff"
                    reflectivity={0.5}
                    transparent={true}
                    opacity={0.3} // More transparent
                />
            </mesh>
        </>
    );
};

export default FractalLightDisplay;
