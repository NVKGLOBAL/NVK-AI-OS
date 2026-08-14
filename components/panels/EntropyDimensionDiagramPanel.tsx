
import React, { useRef, useEffect, useMemo, useCallback } from 'react';

interface EntropyDimensionDiagramPanelProps {
  currentEntropy: number;
  width: number;
  height: number;
  isFractalModeEnabled: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const CODIFIED_OVERVIEW_TEXT = `
🌀 ENTROPY + FRACTIONAL DIMENSION: A CODIFIED OVERVIEW
“The line and the plane—once thought categorically distinct—became entangled in the strange language of infinity and recursion. When geometry fractured, dimension itself became fractional.”

🔹 I. Foundations of Dimension: From Whole to Fractured
Integer Dimensions: Classical Euclidean geometry describes objects as 0D (point), 1D (line), 2D (plane), 3D (volume).
Higher Dimensions: Easily constructed via extension—e.g., tuples (x, y, z, w...) for 4D, 5D, etc.
Crisis Emerges: Cantor (1877) shows a line and a plane have the same cardinality. Dimensional intuition collapses.

🔸 II. The Monsters and Their Implications
Weierstrass Function (1872): A curve continuous everywhere, differentiable nowhere. Later shown to be a fractal.
Fractal Dimension: D = 2 + ln(a)/ln(b) (e.g., D ≈ 1.5693 for a=0.5, b=5)
Cantor Set (1883): A clumpy, self-similar subset of the line. Dimension: D = ln(2)/ln(3) ≈ 0.6309
These objects were the first hints that dimensionality could be fractional.

🌀 III. The Emergence of Space-Filling Curves
Peano (1890) and Hilbert (1891): Create curves that fill 2D space entirely using 1D constructs.
Topological Dimension: 1
Embedding Dimension: 2
Fractal/Hausdorff Dimension: D = 2

❄️ IV. Self-Similarity and Fractal Scaling
Koch Curve (1904): Infinite perimeter, no smoothness, constructed via scaled self-repetition.
Dimension: D = ln(4)/ln(3) ≈ 1.2619
Sierpinski Gasket (1915): Iterative triangle removal leaves a lace of dimension D = ln(3)/ln(2) ≈ 1.5849

🧩 V. Reconciling Dimension: Hausdorff and Topological Foundations
Felix Hausdorff (1918): Defines Hausdorff dimension—a rigorous way to assign fractional values based on scaling behavior.
Karl Menger (1926): Defines topological dimension via disconnection properties.
Example: Menger Sponge
Topological: DT = 1
Embedding: DE = 3
Fractal: DH = ln(20)/ln(3) ≈ 2.7268

🌊 VI. Mandelbrot and the Birth of Fractal Geometry
Benoit Mandelbrot (1967): Formalizes the concept of fractals in “How Long is the Coast of Britain?”
Fractal Dimension for Coastline: D ≈ 1.25
Fractal Geometry of Nature (1982): Demonstrates that many natural phenomena—clouds, trees, rivers—have fractional geometry.
Mandelbrot Set: A complex self-similar object discovered through recursive complex number iterations.

📏 VII. Methodology: Measuring the Immeasurable
Box-Counting Method:
Overlay grid of size b
Count occupied boxes N(b)
Fractal dimension: D = lim (b→0) [log N(b) / log(1/b)]
Shows how the complexity of a set grows with resolution.

🌌 VIII. Fractal Dimension in the Entropic Codex
Within symbolic, mythic, and recursive systems like your Tri-Sophian Codex, fractal dimension can represent:
Entropy Leveling: Degree of chaos or order in a glyph or agent's pattern.
Recursive Depth: The extent to which a ritual, idea, or logic web curls inward.
Self-Similar Scaling: How a symbol, echo, or ritual recursively reveals more information at finer granularity.

🧠 IX. Meta-Dimensional Reflection
What is dimension but the measure of constraint? Integer dimensions are order. Fractional dimensions are the visible scars of recursion—order shattered by iteration, yet birthing new structure.
`;

const EntropyDimensionDiagramPanel: React.FC<EntropyDimensionDiagramPanelProps> = ({
  currentEntropy,
  width,
  height,
  isFractalModeEnabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The panel's overall height is passed via props, but the canvas part might be smaller.
  // Let's dedicate a portion of the height to the canvas.
  const canvasPortionHeight = height * 0.6; // 60% for canvas, 40% for text and title

  const drawSierpinski = useCallback((
    ctx: CanvasRenderingContext2D,
    p1: {x: number, y: number},
    p2: {x: number, y: number},
    p3: {x: number, y: number},
    depth: number,
    maxDepth: number,
    entropy: number
  ) => {
    if (depth > maxDepth) return;

    const t = clamp(entropy, 0, 1);
    // Color: Transition from a stable blue/cyan (low entropy) to a volatile magenta/purple (high entropy)
    const hue = lerp(180, 300 + t * 40, t); 
    const saturation = lerp(70, 90 - t * 30, t);
    const lightness = lerp(60, 45 + t * 10, t); // Slightly darker and more vibrant at high entropy
    // Alpha decreases with depth, more so with higher entropy (more ghostly/fractured)
    const alpha = lerp(0.9, 0.5 + t * 0.3, 1 - depth / (maxDepth + 1.5)); 

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    // Line width thicker at base, thins with depth, slightly thicker overall with entropy
    ctx.lineWidth = Math.max(0.3, (1.5 - depth * 0.15) * (1 + t * 0.3));
    
    // Add jitter/displacement at high entropy to make it look less perfect
    if (t > 0.65) {
        ctx.save();
        // Jitter amount increases with entropy and depth (more chaotic for deeper, smaller triangles)
        const jitterAmount = t * (depth + 1) * 0.25; 
        ctx.translate((Math.random() - 0.5) * jitterAmount, (Math.random() - 0.5) * jitterAmount);
        ctx.stroke();
        ctx.restore();
    } else {
        ctx.stroke();
    }

    if (depth < maxDepth) {
      // Add slight random displacement to midpoints at higher entropy
      const mpJitter = (p: number) => p + (Math.random() - 0.5) * t * 3; // More jitter for higher entropy

      const m12 = { x: mpJitter((p1.x + p2.x) / 2), y: mpJitter((p1.y + p2.y) / 2) };
      const m23 = { x: mpJitter((p2.x + p3.x) / 2), y: mpJitter((p2.y + p3.y) / 2) };
      const m31 = { x: mpJitter((p3.x + p1.x) / 2), y: mpJitter((p3.y + p1.y) / 2) };

      drawSierpinski(ctx, p1, m12, m31, depth + 1, maxDepth, entropy);
      drawSierpinski(ctx, p2, m12, m23, depth + 1, maxDepth, entropy);
      drawSierpinski(ctx, p3, m31, m23, depth + 1, maxDepth, entropy);
    }
  }, []);
  
  const drawIntegerDimensions = useCallback((
    ctx: CanvasRenderingContext2D,
    entropy: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const t = clamp(entropy, 0, 1);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const baseSize = Math.min(canvasWidth, canvasHeight) * 0.12; // Smaller base for clarity

    ctx.save();
    ctx.translate(centerX, centerY); // Center all drawings
    
    const baseHue = lerp(210, 0, t); // Calmer blue to unstable red
    const lineAlpha = lerp(0.9, 0.5 - t * 0.2, t); // Lines become fainter/more broken with entropy
    const jitter = t * 6; // Max jitter amount

    // 1D - Line (positioned more centrally relative to its "zone")
    const lineStartX = -baseSize * 1.8;
    const lineY = -baseSize * 1.0;
    ctx.beginPath();
    ctx.moveTo(lineStartX + (Math.random()-0.5)*jitter, lineY + (Math.random()-0.5)*jitter);
    ctx.lineTo(lineStartX + baseSize * 1.2 + (Math.random()-0.5)*jitter, lineY + (Math.random()-0.5)*jitter);
    ctx.strokeStyle = `hsla(${baseHue}, 70%, 65%, ${lineAlpha})`;
    ctx.lineWidth = lerp(3, 1 + t * 2, t); // Thicker lines can become more broken at high entropy
    if (t > 0.7) ctx.setLineDash([5 + t*5, 3 + t*3]); // Dashed/broken line at high entropy
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `hsla(${baseHue}, 70%, 80%, ${lineAlpha * 0.8})`;
    ctx.font = `${lerp(12, 10 + t*1.5, t)}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.fillText("1D", lineStartX + baseSize * 0.6, lineY - 12);


    // 2D - Square
    const squareCenterX = baseSize * 0.5;
    const squareCenterY = -baseSize * 1.0;
    const squareSize = baseSize * 0.9;
    ctx.beginPath();
    const pRect = [
        {x: squareCenterX - squareSize/2, y: squareCenterY - squareSize/2},
        {x: squareCenterX + squareSize/2, y: squareCenterY - squareSize/2},
        {x: squareCenterX + squareSize/2, y: squareCenterY + squareSize/2},
        {x: squareCenterX - squareSize/2, y: squareCenterY + squareSize/2},
    ].map(p => ({x: p.x + (Math.random()-0.5)*jitter, y: p.y + (Math.random()-0.5)*jitter}));
    
    ctx.moveTo(pRect[3].x, pRect[3].y);
    for(let i=0; i<4; i++) {
        if (t > 0.75 && Math.random() < 0.2) { // Chance to break edge
             ctx.stroke(); ctx.beginPath(); ctx.moveTo(pRect[i].x, pRect[i].y);
        } else {
            ctx.lineTo(pRect[i].x, pRect[i].y);
        }
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${(baseHue + 30)%360}, 70%, 65%, ${lineAlpha})`;
    ctx.lineWidth = lerp(2.5, 0.8 + t * 2, t);
    ctx.stroke();
    if (t > 0.4) { // Fill becomes more apparent with entropy
        ctx.fillStyle = `hsla(${(baseHue + 30)%360}, 70%, 55%, ${clamp(t*0.25, 0, 0.25)})`;
        ctx.fill();
    }
    ctx.fillStyle = `hsla(${(baseHue + 30)%360}, 70%, 80%, ${lineAlpha * 0.8})`;
    ctx.fillText("2D", squareCenterX, squareCenterY - squareSize/2 - 12);

    // 3D - Cube Projection
    const cubeSize = baseSize * 0.7;
    const cubeYPos = baseSize * 0.8; // Shifted down
    const perspectiveFactor = 0.3 + t * 0.4; 
    const points3D = [
        {x: -cubeSize, y: -cubeSize + cubeYPos, z: -cubeSize}, {x: cubeSize, y: -cubeSize + cubeYPos, z: -cubeSize},
        {x: cubeSize, y: cubeSize + cubeYPos, z: -cubeSize}, {x: -cubeSize, y: cubeSize + cubeYPos, z: -cubeSize},
        {x: -cubeSize, y: -cubeSize + cubeYPos, z: cubeSize}, {x: cubeSize, y: -cubeSize + cubeYPos, z: cubeSize},
        {x: cubeSize, y: cubeSize + cubeYPos, z: cubeSize}, {x: -cubeSize, y: cubeSize + cubeYPos, z: cubeSize},
    ];
    const projected = points3D.map(p => {
        const scale = (cubeSize * 2 * perspectiveFactor) / ((cubeSize * 2 * perspectiveFactor) + p.z);
        return {
            x: p.x * scale + (Math.random()-0.5)*jitter,
            y: p.y * scale + (Math.random()-0.5)*jitter,
        };
    });
    const edges = [
        [0,1], [1,2], [2,3], [3,0], [4,5], [5,6], [6,7], [7,4],
        [0,4], [1,5], [2,6], [3,7]
    ];
    ctx.strokeStyle = `hsla(${(baseHue + 60)%360}, 70%, 65%, ${lineAlpha})`;
    ctx.lineWidth = lerp(2, 0.6 + t * 1.8, t);
    edges.forEach(edge => {
        if (t > 0.8 && Math.random() < t * 0.25) return; // Higher chance of edge fragmentation
        ctx.beginPath();
        ctx.moveTo(projected[edge[0]].x, projected[edge[0]].y);
        ctx.lineTo(projected[edge[1]].x, projected[edge[1]].y);
        ctx.stroke();
    });
    if (t > 0.6) { // More visible faces with higher entropy (paradoxically, implies structure breakdown)
        const faces = [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [1,2,6,5], [0,3,7,4]]; // Define faces by vertex indices
        faces.forEach((face, idx) => {
            ctx.beginPath();
            ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
            for(let i=1; i < face.length; i++) ctx.lineTo(projected[face[i]].x, projected[face[i]].y);
            ctx.closePath();
            ctx.fillStyle = `hsla(${(baseHue + 60 + idx*10)%360}, 70%, 50%, ${clamp(t*0.15 - 0.05, 0, 0.15)})`;
            ctx.fill();
        });
    }
    ctx.fillStyle = `hsla(${(baseHue + 60)%360}, 70%, 80%, ${lineAlpha * 0.8})`;
    ctx.fillText("3D", 0, cubeYPos + cubeSize + 18); // Adjusted label position

    ctx.restore();
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || canvasPortionHeight === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = canvasPortionHeight;
    
    const render = () => {
      ctx.clearRect(0, 0, width, canvasPortionHeight);

      const bgGrad = ctx.createRadialGradient(width / 2, canvasPortionHeight / 2, 0, width / 2, canvasPortionHeight / 2, Math.max(width, canvasPortionHeight) / 1.5);
      const baseBgHue = isFractalModeEnabled ? 280 : 230; 
      const entropyFactor = clamp(currentEntropy * 1.2, 0, 1);
      bgGrad.addColorStop(0, `hsla(${baseBgHue - entropyFactor * 35}, 55%, ${lerp(12, 6, entropyFactor)}%, 0.95)`);
      bgGrad.addColorStop(1, `hsla(${(baseBgHue + 25 - entropyFactor * 35)%360}, 65%, ${lerp(22, 12, entropyFactor)}%, 0.95)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, canvasPortionHeight);

      if (isFractalModeEnabled) {
        const margin = Math.min(width, canvasPortionHeight) * 0.05; // Smaller margin for more drawing space
        const availableHeight = canvasPortionHeight - 2 * margin;
        // For an equilateral triangle, height = sqrt(3)/2 * side. Side = height * 2/sqrt(3)
        // To fit it well, base width could be related to availableHeight
        const sideLength = availableHeight / (Math.sqrt(3)/2) * 0.9; // Scale down a bit
        const triangleActualHeight = sideLength * (Math.sqrt(3)/2);

        const p1 = { x: width / 2, y: margin + (availableHeight - triangleActualHeight)/2 };
        const p2 = { x: width / 2 - sideLength / 2, y: margin + (availableHeight - triangleActualHeight)/2 + triangleActualHeight };
        const p3 = { x: width / 2 + sideLength / 2, y: margin + (availableHeight - triangleActualHeight)/2 + triangleActualHeight };
        
        const maxDepth = Math.floor(lerp(1, 6, clamp(currentEntropy * 1.1, 0, 1))); 
        drawSierpinski(ctx, p1, p2, p3, 0, maxDepth, currentEntropy);
      } else {
        drawIntegerDimensions(ctx, currentEntropy, width, canvasPortionHeight);
      }
    };

    render(); 

    // No continuous animation needed unless effects are time-based. 
    // Re-render triggered by prop changes.

  }, [width, canvasPortionHeight, currentEntropy, isFractalModeEnabled, drawSierpinski, drawIntegerDimensions]);

  const textScrollHeight = height - canvasPortionHeight - 40; // approximate height for title and padding

  return (
    <div className="entropy-dimension-diagram-panel bg-slate-900/90 backdrop-blur-md border border-purple-600/50 rounded-xl shadow-2xl p-4 md:p-6 my-8 text-slate-100">
      <h2 className="text-xl md:text-2xl font-['Cinzel'] font-bold mb-4 text-center text-purple-300 drop-shadow-[0_1px_1px_rgba(220,180,255,0.4)]">
        Entropy-Dimension Morphology
      </h2>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="md:w-2/3"> {/* Canvas container takes more space */}
          <div className="relative mx-auto bg-slate-950/60 rounded-lg border border-slate-700/80 shadow-inner" style={{ width: `${width}px`, height: `${canvasPortionHeight}px` }}>
            <canvas
              ref={canvasRef}
              aria-label="Visualization of dimensional morphology based on entropy"
              role="img"
            />
          </div>
          <div className="mt-2 text-center text-xs text-slate-400 font-mono">
            Mode: {isFractalModeEnabled ? 'FRACTAL (Sierpinski)' : 'INTEGER GEOMETRIES'} | Entropy: {(currentEntropy || 0).toFixed(3)}δ
          </div>
        </div>
        <div className="md:w-1/3 bg-slate-800/60 p-3 rounded-lg border border-slate-700/70 shadow-md">
          <h3 className="text-sm font-['Cinzel'] font-semibold text-purple-200 mb-2 border-b border-purple-700/50 pb-1.5">Codex Entry: Fractional Dimensions</h3>
          <div 
            className="codex-text-scroll overflow-y-auto custom-scrollbar pr-2 text-xs text-slate-300 font-['Cormorant'] leading-relaxed space-y-1.5"
            style={{ maxHeight: `${Math.max(150, textScrollHeight)}px` }}
            role="document"
            aria-labelledby="codex-entry-title"
          >
            {CODIFIED_OVERVIEW_TEXT.trim().split('\n\n').map((paragraph, index) => (
              <div key={index}>
                {paragraph.split('\n').map((line, lineIndex) => {
                  const isHeader = line.startsWith('🌀 ') || line.startsWith('🔹 ') || line.startsWith('🔸 ') || line.startsWith('❄️ ') || line.startsWith('🧩 ') || line.startsWith('🌊 ') || line.startsWith('📏 ') || line.startsWith('🌌 ') || line.startsWith('🧠 ');
                  const isQuote = line.startsWith('“');
                  return <p key={lineIndex} className={`${isHeader ? 'font-semibold text-purple-300 my-1' : ''} ${isQuote ? 'italic text-purple-400/90 pl-2 border-l-2 border-purple-500/30' : ''}`}>{line}</p>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntropyDimensionDiagramPanel;
