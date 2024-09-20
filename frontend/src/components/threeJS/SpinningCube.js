// src/components/threeJS/SpinningCube.js

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';

const Cube = () => {
    const meshRef = useRef();

    // Rotate the cube every frame
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.x += 0.003; // Adjust rotation speed as needed
            meshRef.current.rotation.y += 0.003;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <boxGeometry args={[3, 3, 3]} /> {/* Size of the cube */}
            <meshStandardMaterial color="#1e90ff" metalness={0.5} roughness={0.1} />
        </mesh>
    );
};

const SpinningCube = () => {
    return (
        <Canvas
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
                zIndex: -1, // Ensure it's behind other elements
            }}
            camera={{ position: [0, 0, 5], fov: 60 }} // Adjust camera as needed
        >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Cube />
        </Canvas>
    );
};

export default SpinningCube;
