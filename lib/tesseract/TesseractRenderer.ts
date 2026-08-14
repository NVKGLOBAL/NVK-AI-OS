
// lib/tesseract/TesseractRenderer.ts

// Export PLATONIC_4D for potential use elsewhere, though not directly used in this simplified render path
export const PLATONIC_4D = {
  TESSERACT: 0x8C24, // Example hex value
  HECATONICOSACHORON: 0x8C25,
  HEXACOSICHORON: 0x8C26
};

export class TesseractRenderer {
  private vertices: number[][] = []; // Stores 4D vertices [x, y, z, w]
  private colors: number[][] = [];   // Stores RGBA colors per vertex

  constructor() {
    this.generateVertices();
    // console.log("TesseractRenderer initialized with default tesseract vertices.");
  }

  private generateVertices() {
    // 16 vertices of a tesseract, coordinates are -1 or 1
    this.vertices = [];
    this.colors = [];
    for (let i = 0; i < 16; i++) {
      const v = [
        (i & 1) ? 1 : -1,  // x based on 1st bit
        (i & 2) ? 1 : -1,  // y based on 2nd bit
        (i & 4) ? 1 : -1,  // z based on 3rd bit
        (i & 8) ? 1 : -1   // w based on 4th bit
      ];
      this.vertices.push(v);
      // Default color per vertex (e.g., white), could be dynamic later
      this.colors.push([ (i & 1 ? 0.8 : 0.3), (i & 2 ? 0.8 : 0.3), (i & 4 ? 0.8 : 0.3), 1]);
    }
  }

  // Renders the 4D geometry projected into 3D space
  public render(phase: number) {
    // console.log("TesseractRenderer.render called with phase:", phase);
    const projectedVertices = this.vertices.map(([x, y, z, w]) => {
      // Simple perspective projection: scale based on w coordinate
      const perspectiveDivisor = 2.5 - w * 0.5; // w ranges -1 to 1. Divisor from 2 to 3.
      const scale = perspectiveDivisor !== 0 ? 1 / perspectiveDivisor : 1;
      
      // Basic rotation around multiple axes based on phase for complex movement
      const angleX = phase * 0.3; 
      const angleY = phase * 0.5;
      const angleZ = phase * 0.2;
      const angleW = phase * 0.4; // Rotation in 4D space (e.g., ZW plane)

      // Rotate ZW
      let rz = z * Math.cos(angleW) - w * Math.sin(angleW);
      let rw = z * Math.sin(angleW) + w * Math.cos(angleW);
      
      // Rotate YZ (after ZW)
      let ry = y * Math.cos(angleZ) - rz * Math.sin(angleZ);
      rz = y * Math.sin(angleZ) + rz * Math.cos(angleZ);

      // Rotate XZ (after YZ)
      let rx = x * Math.cos(angleY) - rz * Math.sin(angleY);
      rz = x * Math.sin(angleY) + rz * Math.cos(angleY);
      
      // Rotate XY (after XZ)
      let rfinalX = rx * Math.cos(angleX) - ry * Math.sin(angleX);
      let rfinalY = rx * Math.sin(angleX) + ry * Math.cos(angleX);

      return [rfinalX * scale, rfinalY * scale, rz * scale]; // Returns [px, py, pz]
    });

    return {
      vertices: projectedVertices, // Array of 3D points [x,y,z]
      colors: this.colors,         // Array of RGBA colors [r,g,b,a] per vertex
      temporalFactor: 0.5 + 0.5 * Math.sin(phase * 1.5) // Example temporal factor for pulsing/fading
    };
  }
}
