import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Box } from '@react-three/drei'
import * as THREE from 'three'

// Maze layout (1 = wall, 0 = path, 2 = checkpoint, 3 = finish)
const MAZE_LAYOUT = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
  [1,1,1,0,1,1,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,1,2,1],
  [1,1,1,1,1,0,1,0,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]

const WALL_HEIGHT = 3
const WALL_SIZE = 2

interface GameState {
  startTime: number | null
  currentTime: number
  checkpointsReached: Set<string>
  isGameComplete: boolean
  isGameStarted: boolean
}

// Stone wall component
function Wall({ position }: { position: [number, number, number] }) {
  return (
    <Box position={position} args={[WALL_SIZE, WALL_HEIGHT, WALL_SIZE]}>
      <meshStandardMaterial 
        color="#8B4513"
        roughness={0.8}
        metalness={0.1}
      />
    </Box>
  )
}

// Checkpoint component
function Checkpoint({ position, isReached }: { position: [number, number, number], isReached: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && !isReached) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.3, 0.3, 0.6, 8]} />
      <meshStandardMaterial 
        color={isReached ? "#4CAF50" : "#FFD700"}
        emissive={isReached ? "#2E7D32" : "#FFA000"}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

// Finish line component
function FinishLine({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
      meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
      <meshStandardMaterial 
        color="#FF6B6B"
        emissive="#FF1744"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

// Custom first-person controls without pointer lock
function FirstPersonControls({ gameState }: { gameState: GameState }) {
  const { camera, gl } = useThree()
  const isLocked = useRef(false)
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  })
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  // Mouse look
  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!isLocked.current || !gameState.isGameStarted) return

    const movementX = event.movementX || 0
    const movementY = event.movementY || 0
    const PI_2 = Math.PI / 2

    euler.current.setFromQuaternion(camera.quaternion)
    euler.current.y -= movementX * 0.002
    euler.current.x -= movementY * 0.002
    euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x))
    camera.quaternion.setFromEuler(euler.current)
  }, [camera, gameState.isGameStarted])

  // Keyboard controls
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': moveState.current.forward = true; break
      case 'KeyS': moveState.current.backward = true; break
      case 'KeyA': moveState.current.left = true; break
      case 'KeyD': moveState.current.right = true; break
    }
  }, [])

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': moveState.current.forward = false; break
      case 'KeyS': moveState.current.backward = false; break
      case 'KeyA': moveState.current.left = false; break
      case 'KeyD': moveState.current.right = false; break
    }
  }, [])

  // Click to lock
  const onClick = useCallback(() => {
    if (!gameState.isGameStarted) return
    isLocked.current = true
    gl.domElement.style.cursor = 'none'
  }, [gl, gameState.isGameStarted])

  // Escape to unlock
  const onKeyDownEscape = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      isLocked.current = false
      gl.domElement.style.cursor = 'auto'
    }
  }, [gl])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('click', onClick)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keydown', onKeyDownEscape)
    document.addEventListener('keyup', onKeyUp)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keydown', onKeyDownEscape)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [onClick, onMouseMove, onKeyDown, onKeyUp, onKeyDownEscape, gl])

  // Movement and collision
  useFrame((state, delta) => {
    if (!gameState.isGameStarted || gameState.isGameComplete) return

    const speed = 5.0
    velocity.current.x -= velocity.current.x * 10.0 * delta
    velocity.current.z -= velocity.current.z * 10.0 * delta

    direction.current.z = Number(moveState.current.forward) - Number(moveState.current.backward)
    direction.current.x = Number(moveState.current.right) - Number(moveState.current.left)
    direction.current.normalize()

    if (moveState.current.forward || moveState.current.backward) {
      velocity.current.z -= direction.current.z * speed * delta
    }
    if (moveState.current.left || moveState.current.right) {
      velocity.current.x -= direction.current.x * speed * delta
    }

    // Apply movement with collision detection
    const newPosition = camera.position.clone()
    
    // Test X movement
    newPosition.x += velocity.current.x * delta
    const testX = Math.round(newPosition.x / WALL_SIZE)
    const testZ = Math.round(camera.position.z / WALL_SIZE)
    
    if (testX >= 0 && testX < MAZE_LAYOUT[0].length && 
        testZ >= 0 && testZ < MAZE_LAYOUT.length &&
        MAZE_LAYOUT[testZ]?.[testX] !== 1) {
      camera.position.x = newPosition.x
    }

    // Test Z movement
    newPosition.z += velocity.current.z * delta
    const finalTestX = Math.round(camera.position.x / WALL_SIZE)
    const finalTestZ = Math.round(newPosition.z / WALL_SIZE)
    
    if (finalTestX >= 0 && finalTestX < MAZE_LAYOUT[0].length && 
        finalTestZ >= 0 && finalTestZ < MAZE_LAYOUT.length &&
        MAZE_LAYOUT[finalTestZ]?.[finalTestX] !== 1) {
      camera.position.z = newPosition.z
    }
  })

  return null
}

// Player collision detection and game logic
function Player({ gameState, setGameState }: { 
  gameState: GameState, 
  setGameState: React.Dispatch<React.SetStateAction<GameState>> 
}) {
  const { camera } = useThree()

  useFrame(() => {
    if (!gameState.isGameStarted || gameState.isGameComplete) return

    const playerX = Math.round(camera.position.x / WALL_SIZE)
    const playerZ = Math.round(camera.position.z / WALL_SIZE)
    
    // Check bounds
    if (playerX < 0 || playerX >= MAZE_LAYOUT[0].length || 
        playerZ < 0 || playerZ >= MAZE_LAYOUT.length) return

    const cellValue = MAZE_LAYOUT[playerZ]?.[playerX]
    
    // Check checkpoint
    if (cellValue === 2) {
      const checkpointKey = `${playerX}-${playerZ}`
      if (!gameState.checkpointsReached.has(checkpointKey)) {
        setGameState(prev => ({
          ...prev,
          checkpointsReached: new Set([...prev.checkpointsReached, checkpointKey])
        }))
      }
    }
    
    // Check finish
    if (cellValue === 3) {
      setGameState(prev => ({
        ...prev,
        isGameComplete: true
      }))
    }
  })

  return null
}

// Main maze component
function Maze({ gameState, setGameState }: { 
  gameState: GameState, 
  setGameState: React.Dispatch<React.SetStateAction<GameState>> 
}) {
  const walls: JSX.Element[] = []
  const checkpoints: JSX.Element[] = []
  const finishLines: JSX.Element[] = []

  MAZE_LAYOUT.forEach((row, z) => {
    row.forEach((cell, x) => {
      const position: [number, number, number] = [x * WALL_SIZE, WALL_HEIGHT / 2, z * WALL_SIZE]
      
      if (cell === 1) {
        walls.push(<Wall key={`wall-${x}-${z}`} position={position} />)
      } else if (cell === 2) {
        const checkpointKey = `${x}-${z}`
        const isReached = gameState.checkpointsReached.has(checkpointKey)
        checkpoints.push(
          <Checkpoint 
            key={`checkpoint-${x}-${z}`} 
            position={[x * WALL_SIZE, 0.5, z * WALL_SIZE]} 
            isReached={isReached}
          />
        )
      } else if (cell === 3) {
        finishLines.push(
          <FinishLine 
            key={`finish-${x}-${z}`} 
            position={[x * WALL_SIZE, 0.5, z * WALL_SIZE]} 
          />
        )
      }
    })
  })

  return (
    <>
      {walls}
      {checkpoints}
      {finishLines}
      <Player gameState={gameState} setGameState={setGameState} />
      <FirstPersonControls gameState={gameState} />
    </>
  )
}

// Game scene component
function GameScene({ gameState, setGameState }: { 
  gameState: GameState, 
  setGameState: React.Dispatch<React.SetStateAction<GameState>> 
}) {
  const { camera } = useThree()

  // Set initial camera position
  useEffect(() => {
    camera.position.set(1 * WALL_SIZE, 1.6, 1 * WALL_SIZE)
    camera.rotation.set(0, 0, 0)
  }, [camera])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFD700" />

      {/* Fog */}
      <fog attach="fog" args={['#1A1A1A', 5, 25]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0, 14]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#2D2D2D" roughness={0.9} />
      </mesh>

      {/* Maze */}
      <Maze gameState={gameState} setGameState={setGameState} />
    </>
  )
}

// HUD Component
function HUD({ gameState, setGameState }: { 
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
}) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const totalCheckpoints = MAZE_LAYOUT.flat().filter(cell => cell === 2).length

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameStarted: true,
      startTime: Date.now()
    }))
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Timer and Progress */}
      {gameState.isGameStarted && !gameState.isGameComplete && (
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="text-2xl font-bold text-[#FFD700] mb-2">
            {gameState.startTime ? formatTime(gameState.currentTime - gameState.startTime) : '0:00'}
          </div>
          <div className="text-sm opacity-80">
            Checkpoints: {gameState.checkpointsReached.size}/{totalCheckpoints}
          </div>
        </div>
      )}

      {/* Controls hint */}
      {gameState.isGameStarted && !gameState.isGameComplete && (
        <div className="absolute top-6 right-6 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <div className="opacity-80">
            <div>WASD: Move</div>
            <div>Mouse: Look around</div>
            <div>Click: Focus camera</div>
            <div>ESC: Release camera</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!gameState.isGameStarted && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white max-w-md">
            <h1 className="text-4xl font-bold text-[#FFD700] mb-6">Maze Runner 3D</h1>
            <p className="text-lg mb-4">Navigate through the stone maze and reach all checkpoints</p>
            <p className="text-sm opacity-80 mb-6">Use WASD to move, mouse to look around</p>
            <button 
              className="bg-[#8B4513] hover:bg-[#A0522D] text-white px-8 py-3 rounded-lg font-semibold transition-colors pointer-events-auto"
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {gameState.isGameComplete && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="text-center text-white max-w-md">
            <h1 className="text-4xl font-bold text-[#FFD700] mb-6">Maze Complete!</h1>
            <p className="text-2xl mb-4">
              Time: {gameState.startTime ? formatTime(gameState.currentTime - gameState.startTime) : '0:00'}
            </p>
            <p className="text-lg mb-6">
              Checkpoints: {gameState.checkpointsReached.size}/{totalCheckpoints}
            </p>
            <button 
              className="bg-[#8B4513] hover:bg-[#A0522D] text-white px-8 py-3 rounded-lg font-semibold transition-colors pointer-events-auto"
              onClick={() => window.location.reload()}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MazeGame() {
  const [gameState, setGameState] = useState<GameState>({
    startTime: null,
    currentTime: Date.now(),
    checkpointsReached: new Set(),
    isGameComplete: false,
    isGameStarted: false
  })

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => ({ ...prev, currentTime: Date.now() }))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-screen bg-[#1A1A1A] relative overflow-hidden">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        shadows
        className="w-full h-full"
      >
        <GameScene gameState={gameState} setGameState={setGameState} />
      </Canvas>
      <HUD gameState={gameState} setGameState={setGameState} />
    </div>
  )
}