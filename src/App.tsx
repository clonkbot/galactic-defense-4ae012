import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float, Html, Text } from '@react-three/drei'
import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Game Types
interface Tower {
  id: string
  position: [number, number, number]
  type: 'laser' | 'ion' | 'missile'
  level: number
}

interface Enemy {
  id: string
  position: [number, number, number]
  health: number
  maxHealth: number
  speed: number
  pathIndex: number
  type: 'tieFighter' | 'trooper' | 'atst'
}

interface Projectile {
  id: string
  start: [number, number, number]
  target: [number, number, number]
  progress: number
  damage: number
  color: string
}

// Path for enemies
const ENEMY_PATH: [number, number, number][] = [
  [-12, 0.5, -8],
  [-8, 0.5, -8],
  [-8, 0.5, -4],
  [-4, 0.5, -4],
  [-4, 0.5, 0],
  [0, 0.5, 0],
  [0, 0.5, 4],
  [4, 0.5, 4],
  [4, 0.5, 8],
  [8, 0.5, 8],
  [12, 0.5, 8],
]

// Tower placement grid positions
const TOWER_SPOTS: [number, number, number][] = [
  [-10, 0.5, -6],
  [-6, 0.5, -6],
  [-6, 0.5, -2],
  [-2, 0.5, -2],
  [-2, 0.5, 2],
  [2, 0.5, 2],
  [2, 0.5, 6],
  [6, 0.5, 6],
  [6, 0.5, 10],
]

// Laser Turret Component
function LaserTurret({ position, level, enemies, onFire }: {
  position: [number, number, number]
  level: number
  enemies: Enemy[]
  onFire: (start: [number, number, number], target: [number, number, number], damage: number, color: string) => void
}) {
  const turretRef = useRef<THREE.Group>(null!)
  const barrelRef = useRef<THREE.Mesh>(null!)
  const lastFireTime = useRef(0)
  const fireRate = 1000 / (1 + level * 0.5)
  const range = 5 + level
  const damage = 10 + level * 5

  useFrame((state) => {
    if (!turretRef.current) return

    // Find closest enemy in range
    let closestEnemy: Enemy | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      const dx = enemy.position[0] - position[0]
      const dz = enemy.position[2] - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < range && dist < closestDist) {
        closestDist = dist
        closestEnemy = enemy
      }
    }

    if (closestEnemy !== null) {
      // Rotate towards enemy
      const targetEnemy = closestEnemy as Enemy
      const angle = Math.atan2(
        targetEnemy.position[0] - position[0],
        targetEnemy.position[2] - position[2]
      )
      turretRef.current.rotation.y = angle

      // Fire
      const now = state.clock.getElapsedTime() * 1000
      if (now - lastFireTime.current > fireRate) {
        lastFireTime.current = now
        onFire(
          [position[0], position[1] + 1.2, position[2]],
          [...targetEnemy.position] as [number, number, number],
          damage,
          '#ff3333'
        )
      }
    }
  })

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.6, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rotating turret */}
      <group ref={turretRef} position={[0, 0.8, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.4, 0.5]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Barrel */}
        <mesh ref={barrelRef} position={[0, 0.1, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.5 + level * 0.2} />
        </mesh>
        <mesh position={[0, 0.1, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Level indicator lights */}
      {Array.from({ length: level }).map((_, i) => (
        <mesh key={i} position={[0.3 * Math.cos(i * Math.PI * 2 / 3), 0.1, 0.3 * Math.sin(i * Math.PI * 2 / 3)]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  )
}

// Ion Cannon Component
function IonCannon({ position, level, enemies, onFire }: {
  position: [number, number, number]
  level: number
  enemies: Enemy[]
  onFire: (start: [number, number, number], target: [number, number, number], damage: number, color: string) => void
}) {
  const cannonRef = useRef<THREE.Group>(null!)
  const lastFireTime = useRef(0)
  const fireRate = 2000 / (1 + level * 0.3)
  const range = 6 + level * 1.5
  const damage = 25 + level * 10

  useFrame((state) => {
    if (!cannonRef.current) return

    let closestEnemy: Enemy | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      const dx = enemy.position[0] - position[0]
      const dz = enemy.position[2] - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < range && dist < closestDist) {
        closestDist = dist
        closestEnemy = enemy
      }
    }

    if (closestEnemy !== null) {
      const targetEnemy = closestEnemy as Enemy
      const angle = Math.atan2(
        targetEnemy.position[0] - position[0],
        targetEnemy.position[2] - position[2]
      )
      cannonRef.current.rotation.y = angle

      const now = state.clock.getElapsedTime() * 1000
      if (now - lastFireTime.current > fireRate) {
        lastFireTime.current = now
        onFire(
          [position[0], position[1] + 1.5, position[2]],
          [...targetEnemy.position] as [number, number, number],
          damage,
          '#00aaff'
        )
      }
    }
  })

  return (
    <group position={position}>
      {/* Heavy base */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.9, 1, 0.8, 6]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.9} roughness={0.1} />
      </mesh>

      <group ref={cannonRef} position={[0, 1, 0]}>
        {/* Main body */}
        <mesh>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshStandardMaterial color="#0a1a2a" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Twin barrels */}
        <mesh position={[-0.15, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
          <meshStandardMaterial color="#00aaff" emissive="#0066ff" emissiveIntensity={0.8 + level * 0.2} />
        </mesh>
        <mesh position={[0.15, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
          <meshStandardMaterial color="#00aaff" emissive="#0066ff" emissiveIntensity={0.8 + level * 0.2} />
        </mesh>

        {/* Energy coils */}
        <mesh position={[0, 0.4, 0]}>
          <torusGeometry args={[0.3, 0.05, 8, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  )
}

// Missile Launcher Component
function MissileLauncher({ position, level, enemies, onFire }: {
  position: [number, number, number]
  level: number
  enemies: Enemy[]
  onFire: (start: [number, number, number], target: [number, number, number], damage: number, color: string) => void
}) {
  const launcherRef = useRef<THREE.Group>(null!)
  const lastFireTime = useRef(0)
  const fireRate = 3000 / (1 + level * 0.2)
  const range = 8 + level * 2
  const damage = 50 + level * 20

  useFrame((state) => {
    if (!launcherRef.current) return

    let closestEnemy: Enemy | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      const dx = enemy.position[0] - position[0]
      const dz = enemy.position[2] - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < range && dist < closestDist) {
        closestDist = dist
        closestEnemy = enemy
      }
    }

    if (closestEnemy !== null) {
      const targetEnemy = closestEnemy as Enemy
      const angle = Math.atan2(
        targetEnemy.position[0] - position[0],
        targetEnemy.position[2] - position[2]
      )
      launcherRef.current.rotation.y = angle

      const now = state.clock.getElapsedTime() * 1000
      if (now - lastFireTime.current > fireRate) {
        lastFireTime.current = now
        onFire(
          [position[0], position[1] + 1.8, position[2]],
          [...targetEnemy.position] as [number, number, number],
          damage,
          '#ff6600'
        )
      }
    }
  })

  return (
    <group position={position}>
      {/* Heavy armored base */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#3a2a1a" metalness={0.7} roughness={0.3} />
      </mesh>

      <group ref={launcherRef} position={[0, 1.2, 0]}>
        {/* Launcher pod */}
        <mesh position={[0, 0.3, 0.2]}>
          <boxGeometry args={[0.8, 0.6, 1]} />
          <meshStandardMaterial color="#2a1a0a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Missile tubes */}
        {[-0.2, 0.2].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 0.3, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[x, 0.3, 0.9]}>
              <coneGeometry args={[0.1, 0.2, 8]} />
              <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={0.5 + level * 0.3} />
            </mesh>
          </group>
        ))}

        {/* Targeting array */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
          <meshStandardMaterial color="#ff3300" emissive="#ff0000" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  )
}

// TIE Fighter Enemy
function TieFighter({ position, health, maxHealth }: { position: [number, number, number], health: number, maxHealth: number }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <Float speed={3} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* Cockpit */}
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Window */}
        <mesh position={[0, 0, 0.35]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
        </mesh>

        {/* Wings */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.6, 0, 0]}>
            <boxGeometry args={[0.05, 0.8, 0.6]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}

        {/* Health bar */}
        <Html position={[0, 0.8, 0]} center distanceFactor={10}>
          <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-200"
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
        </Html>
      </group>
    </Float>
  )
}

// Stormtrooper Enemy
function Stormtrooper({ position, health, maxHealth }: { position: [number, number, number], health: number, maxHealth: number }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 8) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Helmet */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Visor */}
      <mesh position={[0, 0.73, 0.15]}>
        <boxGeometry args={[0.2, 0.05, 0.05]} />
        <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Health bar */}
      <Html position={[0, 1.1, 0]} center distanceFactor={10}>
        <div className="w-10 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-200"
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
        </div>
      </Html>
    </group>
  )
}

// AT-ST Enemy (Walker)
function ATST({ position, health, maxHealth }: { position: [number, number, number], health: number, maxHealth: number }) {
  const groupRef = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!)
  const legR = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (legL.current && legR.current) {
      legL.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * 0.2
      legR.current.rotation.x = Math.sin(state.clock.elapsedTime * 4 + Math.PI) * 0.2
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Head/Cockpit */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.8]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Chin guns */}
      <mesh position={[0, 1.35, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Window */}
      <mesh position={[0, 1.55, 0.35]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Legs */}
      <group ref={legL} position={[-0.3, 0.7, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.8, 0.15]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.8, 0.1]}>
          <boxGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      <group ref={legR} position={[0.3, 0.7, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.8, 0.15]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.8, 0.1]}>
          <boxGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Health bar */}
      <Html position={[0, 2.2, 0]} center distanceFactor={10}>
        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-200"
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
        </div>
      </Html>
    </group>
  )
}

// Projectile Component
function ProjectileBeam({ start, target, progress, color }: {
  start: [number, number, number]
  target: [number, number, number]
  progress: number
  color: string
}) {
  const x = start[0] + (target[0] - start[0]) * progress
  const y = start[1] + (target[1] - start[1]) * progress
  const z = start[2] + (target[2] - start[2]) * progress

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
    </mesh>
  )
}

// Tower Placement Spot
function PlacementSpot({ position, onPlace, canAfford }: {
  position: [number, number, number]
  onPlace: (pos: [number, number, number]) => void
  canAfford: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={[position[0], 0.05, position[2]]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => canAfford && onPlace(position)}
    >
      <cylinderGeometry args={[0.8, 0.8, 0.1, 8]} />
      <meshStandardMaterial
        color={hovered && canAfford ? '#00ff00' : '#333333'}
        transparent
        opacity={hovered ? 0.8 : 0.4}
        emissive={hovered && canAfford ? '#00ff00' : '#000000'}
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

// Ground/Platform
function GamePlatform() {
  return (
    <group>
      {/* Main platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 25]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.7} />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[30, 30, '#333355', '#222244']} position={[0, 0.01, 0]} />

      {/* Path markers */}
      {ENEMY_PATH.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.02, pos[2]]}>
          <ringGeometry args={[0.3, 0.5, 8]} />
          <meshStandardMaterial
            color="#ff3333"
            emissive="#ff0000"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Rebel Base (endpoint) */}
      <group position={[12, 0, 8]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[1.2, 1.5, 1.6, 6]} />
          <meshStandardMaterial color="#2a4a6a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial color="#3a5a7a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={1} />
        </mesh>
        <Text
          position={[0, 3.5, 0]}
          fontSize={0.4}
          color="#ff6600"
          anchorX="center"
          anchorY="middle"
        >
          REBEL BASE
        </Text>
      </group>

      {/* Imperial spawn point */}
      <group position={[-12, 0, -8]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
        </mesh>
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#ff3333"
          anchorX="center"
          anchorY="middle"
        >
          IMPERIAL SPAWN
        </Text>
      </group>
    </group>
  )
}

// Game Scene Component
function GameScene({
  towers,
  enemies,
  projectiles,
  credits,
  selectedTower,
  onPlaceTower,
  onFire
}: {
  towers: Tower[]
  enemies: Enemy[]
  projectiles: Projectile[]
  credits: number
  selectedTower: 'laser' | 'ion' | 'missile'
  onPlaceTower: (position: [number, number, number]) => void
  onFire: (start: [number, number, number], target: [number, number, number], damage: number, color: string) => void
}) {
  const towerCosts = { laser: 50, ion: 100, missile: 150 }
  const occupiedSpots = new Set(towers.map(t => `${t.position[0]},${t.position[2]}`))

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#ff3333" />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#3333ff" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" />

      <GamePlatform />

      {/* Available placement spots */}
      {TOWER_SPOTS.filter(spot => !occupiedSpots.has(`${spot[0]},${spot[2]}`)).map((spot, i) => (
        <PlacementSpot
          key={i}
          position={spot}
          onPlace={onPlaceTower}
          canAfford={credits >= towerCosts[selectedTower]}
        />
      ))}

      {/* Towers */}
      {towers.map(tower => {
        switch (tower.type) {
          case 'laser':
            return <LaserTurret key={tower.id} position={tower.position} level={tower.level} enemies={enemies} onFire={onFire} />
          case 'ion':
            return <IonCannon key={tower.id} position={tower.position} level={tower.level} enemies={enemies} onFire={onFire} />
          case 'missile':
            return <MissileLauncher key={tower.id} position={tower.position} level={tower.level} enemies={enemies} onFire={onFire} />
        }
      })}

      {/* Enemies */}
      {enemies.map(enemy => {
        switch (enemy.type) {
          case 'tieFighter':
            return <TieFighter key={enemy.id} position={enemy.position} health={enemy.health} maxHealth={enemy.maxHealth} />
          case 'trooper':
            return <Stormtrooper key={enemy.id} position={enemy.position} health={enemy.health} maxHealth={enemy.maxHealth} />
          case 'atst':
            return <ATST key={enemy.id} position={enemy.position} health={enemy.health} maxHealth={enemy.maxHealth} />
        }
      })}

      {/* Projectiles */}
      {projectiles.map(proj => (
        <ProjectileBeam key={proj.id} start={proj.start} target={proj.target} progress={proj.progress} color={proj.color} />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  )
}

// Main App Component
export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu')
  const [wave, setWave] = useState(1)
  const [credits, setCredits] = useState(200)
  const [lives, setLives] = useState(10)
  const [score, setScore] = useState(0)
  const [towers, setTowers] = useState<Tower[]>([])
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [selectedTower, setSelectedTower] = useState<'laser' | 'ion' | 'missile'>('laser')

  const enemyIdCounter = useRef(0)
  const towerIdCounter = useRef(0)
  const projectileIdCounter = useRef(0)

  const towerCosts = { laser: 50, ion: 100, missile: 150 }

  const handleFire = useCallback((start: [number, number, number], target: [number, number, number], damage: number, color: string) => {
    const id = `proj-${projectileIdCounter.current++}`
    setProjectiles(prev => [...prev, { id, start, target, progress: 0, damage, color }])
  }, [])

  const handlePlaceTower = useCallback((position: [number, number, number]) => {
    if (credits >= towerCosts[selectedTower]) {
      setCredits(prev => prev - towerCosts[selectedTower])
      setTowers(prev => [...prev, {
        id: `tower-${towerIdCounter.current++}`,
        position,
        type: selectedTower,
        level: 1
      }])
    }
  }, [credits, selectedTower])

  const spawnWave = useCallback(() => {
    const enemyCount = 3 + wave * 2
    const newEnemies: Enemy[] = []

    for (let i = 0; i < enemyCount; i++) {
      const rand = Math.random()
      let type: 'tieFighter' | 'trooper' | 'atst'
      let health: number
      let speed: number

      if (wave >= 3 && rand > 0.85) {
        type = 'atst'
        health = 150 + wave * 30
        speed = 0.5
      } else if (rand > 0.5) {
        type = 'tieFighter'
        health = 30 + wave * 10
        speed = 1.5
      } else {
        type = 'trooper'
        health = 50 + wave * 15
        speed = 1
      }

      newEnemies.push({
        id: `enemy-${enemyIdCounter.current++}`,
        position: [...ENEMY_PATH[0]] as [number, number, number],
        health,
        maxHealth: health,
        speed,
        pathIndex: 0,
        type
      })
    }

    // Stagger spawn
    newEnemies.forEach((enemy, i) => {
      setTimeout(() => {
        setEnemies(prev => [...prev, enemy])
      }, i * 1000)
    })
  }, [wave])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const gameLoop = setInterval(() => {
      // Update projectiles
      setProjectiles(prev => {
        const updated = prev.map(p => ({ ...p, progress: p.progress + 0.1 }))
        return updated.filter(p => p.progress < 1)
      })

      // Check projectile hits
      setEnemies(prev => {
        let newEnemies = [...prev]

        projectiles.forEach(proj => {
          if (proj.progress >= 0.9 && proj.progress < 1) {
            const hitEnemy = newEnemies.find(e => {
              const dx = e.position[0] - proj.target[0]
              const dz = e.position[2] - proj.target[2]
              return Math.sqrt(dx * dx + dz * dz) < 1
            })

            if (hitEnemy) {
              hitEnemy.health -= proj.damage
              if (hitEnemy.health <= 0) {
                const reward = hitEnemy.type === 'atst' ? 50 : hitEnemy.type === 'tieFighter' ? 15 : 20
                setCredits(c => c + reward)
                setScore(s => s + reward * 10)
                newEnemies = newEnemies.filter(e => e.id !== hitEnemy.id)
              }
            }
          }
        })

        return newEnemies
      })

      // Move enemies along path
      setEnemies(prev => {
        return prev.map(enemy => {
          const nextIndex = enemy.pathIndex + 1
          if (nextIndex >= ENEMY_PATH.length) {
            // Enemy reached the base
            setLives(l => l - 1)
            return null
          }

          const target = ENEMY_PATH[nextIndex]
          const dx = target[0] - enemy.position[0]
          const dz = target[2] - enemy.position[2]
          const dist = Math.sqrt(dx * dx + dz * dz)

          if (dist < 0.2) {
            return { ...enemy, pathIndex: nextIndex, position: [...target] as [number, number, number] }
          }

          const speed = enemy.speed * 0.05
          const newPos: [number, number, number] = [
            enemy.position[0] + (dx / dist) * speed,
            enemy.position[1],
            enemy.position[2] + (dz / dist) * speed
          ]

          return { ...enemy, position: newPos }
        }).filter((e): e is Enemy => e !== null)
      })
    }, 50)

    return () => clearInterval(gameLoop)
  }, [gameState, projectiles])

  // Wave management
  useEffect(() => {
    if (gameState === 'playing' && enemies.length === 0) {
      const timeout = setTimeout(() => {
        spawnWave()
        setWave(w => w + 1)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [gameState, enemies.length, spawnWave])

  // Check game over
  useEffect(() => {
    if (lives <= 0 && gameState === 'playing') {
      setGameState('gameover')
    }
  }, [lives, gameState])

  const startGame = () => {
    setGameState('playing')
    setWave(1)
    setCredits(200)
    setLives(10)
    setScore(0)
    setTowers([])
    setEnemies([])
    setProjectiles([])
    enemyIdCounter.current = 0
    towerIdCounter.current = 0
    projectileIdCounter.current = 0
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 15, 20], fov: 50 }}>
        <Suspense fallback={null}>
          <GameScene
            towers={towers}
            enemies={enemies}
            projectiles={projectiles}
            credits={credits}
            selectedTower={selectedTower}
            onPlaceTower={handlePlaceTower}
            onFire={handleFire}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-6 md:space-y-8 px-4">
            <div className="relative">
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 drop-shadow-2xl animate-pulse">
                GALACTIC
              </h1>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 drop-shadow-2xl">
                DEFENSE
              </h1>
              <div className="absolute -inset-4 bg-amber-500/20 blur-3xl -z-10" />
            </div>

            <p className="font-body text-amber-200/80 text-sm md:text-lg tracking-widest uppercase">
              A Tower Defense Experience
            </p>

            <button
              onClick={startGame}
              className="group relative px-8 md:px-12 py-4 md:py-5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-display font-bold text-lg md:text-xl tracking-wider rounded-sm hover:from-amber-400 hover:to-amber-500 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">DEPLOY FORCES</span>
              <div className="absolute inset-0 bg-amber-300 opacity-0 group-hover:opacity-20 transition-opacity rounded-sm" />
            </button>

            <div className="font-body text-xs md:text-sm text-amber-200/50 space-y-2 max-w-md mx-auto">
              <p>Click empty spots to place towers</p>
              <p>Defend the Rebel Base from Imperial forces</p>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-0 left-0 right-0 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 pointer-events-none">
            <div className="flex gap-3 md:gap-6 flex-wrap">
              <div className="bg-black/70 backdrop-blur-md px-3 md:px-4 py-2 rounded border border-amber-500/30">
                <span className="font-body text-[10px] md:text-xs text-amber-400/70 tracking-widest">WAVE</span>
                <p className="font-display text-xl md:text-2xl font-bold text-amber-400">{wave}</p>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-3 md:px-4 py-2 rounded border border-green-500/30">
                <span className="font-body text-[10px] md:text-xs text-green-400/70 tracking-widest">CREDITS</span>
                <p className="font-display text-xl md:text-2xl font-bold text-green-400">{credits}</p>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-3 md:px-4 py-2 rounded border border-red-500/30">
                <span className="font-body text-[10px] md:text-xs text-red-400/70 tracking-widest">LIVES</span>
                <p className="font-display text-xl md:text-2xl font-bold text-red-400">{lives}</p>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur-md px-3 md:px-4 py-2 rounded border border-cyan-500/30">
              <span className="font-body text-[10px] md:text-xs text-cyan-400/70 tracking-widest">SCORE</span>
              <p className="font-display text-xl md:text-2xl font-bold text-cyan-400">{score.toLocaleString()}</p>
            </div>
          </div>

          {/* Tower Selection */}
          <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 pointer-events-auto">
            {[
              { type: 'laser' as const, name: 'LASER', cost: 50, color: 'red' },
              { type: 'ion' as const, name: 'ION', cost: 100, color: 'blue' },
              { type: 'missile' as const, name: 'MISSILE', cost: 150, color: 'orange' },
            ].map(tower => (
              <button
                key={tower.type}
                onClick={() => setSelectedTower(tower.type)}
                className={`
                  relative px-3 md:px-6 py-2 md:py-3 rounded
                  transition-all duration-200 transform active:scale-95
                  ${selectedTower === tower.type
                    ? `bg-${tower.color}-500/30 border-2 border-${tower.color}-400 scale-105`
                    : 'bg-black/70 border border-gray-600 hover:border-gray-400'
                  }
                  ${credits < tower.cost ? 'opacity-50' : ''}
                `}
                style={{
                  borderColor: selectedTower === tower.type
                    ? (tower.color === 'red' ? '#f87171' : tower.color === 'blue' ? '#60a5fa' : '#fb923c')
                    : undefined,
                  backgroundColor: selectedTower === tower.type
                    ? (tower.color === 'red' ? 'rgba(248,113,113,0.2)' : tower.color === 'blue' ? 'rgba(96,165,250,0.2)' : 'rgba(251,146,60,0.2)')
                    : undefined
                }}
              >
                <span className="font-display text-xs md:text-sm font-bold tracking-wider" style={{
                  color: tower.color === 'red' ? '#f87171' : tower.color === 'blue' ? '#60a5fa' : '#fb923c'
                }}>{tower.name}</span>
                <p className="font-body text-[10px] md:text-xs text-gray-400">{tower.cost}c</p>
              </button>
            ))}
          </div>
        </>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-center space-y-6 md:space-y-8 px-4">
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-wider text-red-500 animate-pulse">
              GAME OVER
            </h1>
            <p className="font-body text-gray-400 text-base md:text-lg">The Empire has prevailed...</p>

            <div className="space-y-2">
              <p className="font-body text-sm md:text-base text-amber-400/70">Final Score</p>
              <p className="font-display text-4xl md:text-5xl font-bold text-amber-400">{score.toLocaleString()}</p>
              <p className="font-body text-xs md:text-sm text-gray-500">Wave {wave - 1} reached</p>
            </div>

            <button
              onClick={startGame}
              className="px-8 md:px-12 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-display font-bold text-base md:text-lg tracking-wider rounded-sm hover:from-red-500 hover:to-red-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-2 md:py-3 text-center pointer-events-none">
        <p className="font-body text-[10px] md:text-xs text-gray-600 tracking-wider">
          Requested by <span className="text-gray-500">@lowcapeater</span> · Built by <span className="text-gray-500">@clonkbot</span>
        </p>
      </footer>
    </div>
  )
}
