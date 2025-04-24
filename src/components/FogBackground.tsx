import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface FogBackgroundProps {
  color?: string; // Hex color code for the fog
  near?: number; // Near distance for fog
  far?: number; // Far distance for fog
}

function FogBackground({ 
  color = '#141529', // Match your app's background color
  near = 1, 
  far = 3 
}: FogBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set background color
    const fogColor = new THREE.Color(color);
    scene.background = fogColor;
    
    // Add fog
    scene.fog = new THREE.Fog(fogColor, near, far);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.z = 2;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add some moving particles to enhance the fog effect
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const size = 20;
    
    // Create random particles in 3D space
    for (let i = 0; i < 500; i++) {
      const x = (Math.random() * size) - (size / 2);
      const y = (Math.random() * size) - (size / 2);
      const z = (Math.random() * size) - (size / 2);
      vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Particle material with small size and slight transparency
    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color(fogColor).multiplyScalar(1.2), // Slightly brighter than fog
      transparent: true,
      opacity: 0.6,
      fog: true
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Add directional light to create depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation function
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

      // Slowly rotate particles for movement effect
      particles.rotation.x += 0.0003;
      particles.rotation.y += 0.0002;
      
      // Move particles slightly to create flowing effect
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 0.005; // Move along z-axis
        
        // Reset position if particle goes beyond far plane
        if (positions[i + 2] > far) {
          positions[i + 2] = -far;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Render the scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Continue the animation loop
      requestRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    requestRef.current = requestAnimationFrame(animate);

    // Clean up
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose of resources
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [color, near, far]);
  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Place behind other content
        pointerEvents: 'none' // Allow clicks to pass through
      }} 
    />
  );
};

// Make sure to export the component as default
export default FogBackground;
