import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface FogBackgroundProps {
  color?: string;
  near?: number;
  far?: number;
}

function FogBackground({ 
  color = '#141529',
  near = 1, 
  far = 3 
}: FogBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Create scene
      const scene = new THREE.Scene();
      
      // Set background color and fog
      const fogColor = new THREE.Color(color);
      scene.background = fogColor;
      scene.fog = new THREE.Fog(fogColor, near, far);

      // Set up camera
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 2;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      // Add some particles
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < 2000; i++) {
        vertices.push(
          THREE.MathUtils.randFloatSpread(10),
          THREE.MathUtils.randFloatSpread(10),
          THREE.MathUtils.randFloatSpread(10)
        );
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const particles = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({ 
          color: 0xffffff, 
          size: 0.02,
          transparent: true,
          opacity: 0.8
        })
      );
      scene.add(particles);

      // Animation
      let animationFrame: number;
      const animate = () => {
        animationFrame = requestAnimationFrame(animate);
        particles.rotation.x += 0.0001;
        particles.rotation.y += 0.0001;
        renderer.render(scene, camera);
      };

      animate();

      // Handle resize
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrame);
        if (containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        geometry.dispose();
        particles.material.dispose();
        renderer.dispose();
      };
    } catch (error) {
      console.error('Error initializing FogBackground:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize 3D background');
    }
  }, [color, near, far]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    >
      {error && (
        <div className="absolute inset-0 bg-[#141529] opacity-80" />
      )}
    </div>
  );
}

export default FogBackground;
