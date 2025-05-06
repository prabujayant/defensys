
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VectorData {
  rotationSpeed: {
    x: number;
    y: number;
    z: number;
  };
  movementSpeed: {
    x: number;
    y: number;
    z: number;
  };
}

type Vector = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> & {
  userData: VectorData;
};

export const VectorBackground = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const { clientWidth: width, clientHeight: height } = container;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true
    });
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create vectors
    const vectors: Vector[] = [];
    const vectorCount = 150; // Increased number of vectors
    const vectorMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.6, // Slightly more transparent
      linewidth: 1.5 // Thinner lines
    });

    for (let i = 0; i < vectorCount; i++) {
      const points = [];
      const length = Math.random() * 3 + 1; // Shorter vectors
      
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, length, 0));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const vector = new THREE.Line(geometry, vectorMaterial);
      
      // Wider initial distribution
      const range = Math.min(width, height) / 2; // Doubled range
      vector.position.set(
        (Math.random() - 0.5) * range * 1.5, // Even wider X spread
        (Math.random() - 0.5) * range * 1.5, // Even wider Y spread
        (Math.random() - 0.5) * range // Normal Z spread
      );
      
      vector.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      const vectorWithData = vector as Vector;
      vectorWithData.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02, // Doubled rotation speed
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        movementSpeed: {
          x: (Math.random() - 0.5) * 0.2, // Quadrupled movement speed
          y: (Math.random() - 0.5) * 0.2,
          z: (Math.random() - 0.5) * 0.2
        }
      };
      
      vectors.push(vectorWithData);
      scene.add(vectorWithData);
    }

    camera.position.z = Math.min(width, height) / 2.5; // Moved camera back slightly

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      vectors.forEach(vector => {
        vector.rotation.x += vector.userData.rotationSpeed.x;
        vector.rotation.y += vector.userData.rotationSpeed.y;
        vector.rotation.z += vector.userData.rotationSpeed.z;

        vector.position.x += vector.userData.movementSpeed.x;
        vector.position.y += vector.userData.movementSpeed.y;
        vector.position.z += vector.userData.movementSpeed.z;

        const bound = Math.min(width, height) / 2; // Wider bounds
        if (Math.abs(vector.position.x) > bound) {
          vector.userData.movementSpeed.x *= -1;
          // Add small random variation when bouncing
          vector.userData.movementSpeed.y += (Math.random() - 0.5) * 0.1;
          vector.userData.movementSpeed.z += (Math.random() - 0.5) * 0.1;
        }
        if (Math.abs(vector.position.y) > bound) {
          vector.userData.movementSpeed.y *= -1;
          vector.userData.movementSpeed.x += (Math.random() - 0.5) * 0.1;
          vector.userData.movementSpeed.z += (Math.random() - 0.5) * 0.1;
        }
        if (Math.abs(vector.position.z) > bound) {
          vector.userData.movementSpeed.z *= -1;
          vector.userData.movementSpeed.x += (Math.random() - 0.5) * 0.1;
          vector.userData.movementSpeed.y += (Math.random() - 0.5) * 0.1;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.position.z = Math.min(newWidth, newHeight) / 2.5;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      vectors.forEach(vector => {
        vector.geometry.dispose();
        vector.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
};