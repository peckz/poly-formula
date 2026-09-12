import * as THREE from 'three'

/**
 * Creates a low-poly Formula racing car mesh group.
 * The car points in the -Z direction (standard Three.js forward) when rotation.y = 0.
 * Scale: 1 unit = 1 metre.
 */
export function createCarMesh(): THREE.Group {
  const carGroup = new THREE.Group()

  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xe10600, // Formula red
    roughness: 0.3,
    metalness: 0.2,
  })

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, // Carbon / Matte black
    roughness: 0.6,
    metalness: 0.1,
  })

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111, // Pirelli tire rubber
    roughness: 0.8,
    metalness: 0.05,
  })

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc, // Silver / alloy
    roughness: 0.2,
    metalness: 0.8,
  })

  const helmetMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc00, // Yellow driver helmet
    roughness: 0.2,
    metalness: 0.3,
  })

  const rearLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff0022,
    emissiveIntensity: 0.8,
  })

  // 1. Main Chassis Monocoque
  const chassisGeom = new THREE.BoxGeometry(0.8, 0.45, 3.2)
  const chassisMesh = new THREE.Mesh(chassisGeom, bodyMaterial)
  chassisMesh.position.set(0, 0.38, 0.1)
  chassisMesh.castShadow = true
  carGroup.add(chassisMesh)

  // 2. Nose Cone (tapered front)
  const noseGeom = new THREE.BoxGeometry(0.5, 0.25, 1.3)
  const noseMesh = new THREE.Mesh(noseGeom, bodyMaterial)
  noseMesh.position.set(0, 0.28, -1.8)
  noseMesh.rotation.x = 0.05
  noseMesh.castShadow = true
  carGroup.add(noseMesh)

  // 3. Cockpit Opening & Air intake scoop
  const cockpitGeom = new THREE.BoxGeometry(0.5, 0.3, 0.7)
  const cockpitMesh = new THREE.Mesh(cockpitGeom, darkMaterial)
  cockpitMesh.position.set(0, 0.58, -0.2)
  carGroup.add(cockpitMesh)

  const airboxGeom = new THREE.BoxGeometry(0.35, 0.45, 0.8)
  const airboxMesh = new THREE.Mesh(airboxGeom, bodyMaterial)
  airboxMesh.position.set(0, 0.72, 0.4)
  carGroup.add(airboxMesh)

  // 4. Driver Helmet
  const helmetGeom = new THREE.SphereGeometry(0.18, 16, 16)
  const helmetMesh = new THREE.Mesh(helmetGeom, helmetMaterial)
  helmetMesh.position.set(0, 0.65, -0.25)
  carGroup.add(helmetMesh)

  // 5. Sidepods
  const sidepodGeom = new THREE.BoxGeometry(0.45, 0.38, 1.8)
  const leftSidepod = new THREE.Mesh(sidepodGeom, bodyMaterial)
  leftSidepod.position.set(-0.62, 0.35, 0.2)
  leftSidepod.castShadow = true
  carGroup.add(leftSidepod)

  const rightSidepod = new THREE.Mesh(sidepodGeom, bodyMaterial)
  rightSidepod.position.set(0.62, 0.35, 0.2)
  rightSidepod.castShadow = true
  carGroup.add(rightSidepod)

  // 6. Front Wing
  const frontWingGeom = new THREE.BoxGeometry(1.9, 0.06, 0.5)
  const frontWingMesh = new THREE.Mesh(frontWingGeom, darkMaterial)
  frontWingMesh.position.set(0, 0.16, -2.3)
  frontWingMesh.castShadow = true
  carGroup.add(frontWingMesh)

  // Front Wing Endplates
  const endplateGeom = new THREE.BoxGeometry(0.05, 0.22, 0.55)
  const leftEndplate = new THREE.Mesh(endplateGeom, bodyMaterial)
  leftEndplate.position.set(-0.95, 0.22, -2.3)
  carGroup.add(leftEndplate)

  const rightEndplate = new THREE.Mesh(endplateGeom, bodyMaterial)
  rightEndplate.position.set(0.95, 0.22, -2.3)
  carGroup.add(rightEndplate)

  // 7. Rear Wing
  const rearWingGeom = new THREE.BoxGeometry(1.5, 0.08, 0.4)
  const rearWingMesh = new THREE.Mesh(rearWingGeom, darkMaterial)
  rearWingMesh.position.set(0, 0.95, 1.7)
  rearWingMesh.castShadow = true
  carGroup.add(rearWingMesh)

  const rearPylonGeom = new THREE.BoxGeometry(0.08, 0.65, 0.1)
  const leftPylon = new THREE.Mesh(rearPylonGeom, darkMaterial)
  leftPylon.position.set(-0.25, 0.65, 1.7)
  carGroup.add(leftPylon)

  const rightPylon = new THREE.Mesh(rearPylonGeom, darkMaterial)
  rightPylon.position.set(0.25, 0.65, 1.7)
  carGroup.add(rightPylon)

  const rearEndplateGeom = new THREE.BoxGeometry(0.05, 0.45, 0.5)
  const leftRearEndplate = new THREE.Mesh(rearEndplateGeom, bodyMaterial)
  leftRearEndplate.position.set(-0.75, 0.9, 1.7)
  carGroup.add(leftRearEndplate)

  const rightRearEndplate = new THREE.Mesh(rearEndplateGeom, bodyMaterial)
  rightRearEndplate.position.set(0.75, 0.9, 1.7)
  carGroup.add(rightRearEndplate)

  // Rear Rain Light
  const rearLightGeom = new THREE.BoxGeometry(0.12, 0.12, 0.05)
  const rearLightMesh = new THREE.Mesh(rearLightGeom, rearLightMaterial)
  rearLightMesh.position.set(0, 0.32, 1.72)
  carGroup.add(rearLightMesh)

  // 8. Wheels (Front: radius 0.33m, width 0.35m | Rear: radius 0.35m, width 0.42m)
  const wheelPositions = [
    { x: -0.88, y: 0.33, z: -1.45, r: 0.33, w: 0.35, isFront: true }, // Front Left
    { x: 0.88, y: 0.33, z: -1.45, r: 0.33, w: 0.35, isFront: true },  // Front Right
    { x: -0.92, y: 0.35, z: 1.35, r: 0.35, w: 0.42, isFront: false },  // Rear Left
    { x: 0.92, y: 0.35, z: 1.35, r: 0.35, w: 0.42, isFront: false },   // Rear Right
  ]

  for (const wp of wheelPositions) {
    const wheelGroup = new THREE.Group()
    wheelGroup.position.set(wp.x, wp.y, wp.z)

    // Tire Cylinder
    const tireGeom = new THREE.CylinderGeometry(wp.r, wp.r, wp.w, 20)
    tireGeom.rotateZ(Math.PI / 2) // Orient cylinder along X axis
    const tireMesh = new THREE.Mesh(tireGeom, wheelMaterial)
    tireMesh.castShadow = true
    wheelGroup.add(tireMesh)

    // Rim Hub
    const rimGeom = new THREE.CylinderGeometry(wp.r * 0.55, wp.r * 0.55, wp.w + 0.01, 16)
    rimGeom.rotateZ(Math.PI / 2)
    const rimMesh = new THREE.Mesh(rimGeom, rimMaterial)
    wheelGroup.add(rimMesh)

    carGroup.add(wheelGroup)
  }

  return carGroup
}
