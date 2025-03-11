import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import Konva from 'konva';

const KonvaOverlay = (splineData: { points: any }) => {
  let container: HTMLDivElement | undefined;
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let group: Konva.Group;
  
  const points = splineData?.points;
  const [scaleFactor, setScaleFactor] = createSignal(1);

  let konvaPoints: { x: number; y: number }[] = [];

  const updateOverlay = () => {
    if (!group) return;
    const scale = scaleFactor();
    group.scale({ x: scale, y: scale });
    layer.batchDraw();
  };

  onMount(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    stage = new Konva.Stage({
      container: container!,
      width,
      height,
    });
    layer = new Konva.Layer();
    stage.add(layer);

    group = new Konva.Group({
      draggable: true,
    });
    layer.add(group);

    // calculate bounding box for the points
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(([x, y]: [number, number]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    
    const scaleX = (width * 0.8) / boxWidth;
    const scaleY = (height * 0.8) / boxHeight;
    const baseScale = Math.min(scaleX, scaleY);
    const offsetX = (width - boxWidth * baseScale) / 2;
    const offsetY = (height - boxHeight * baseScale) / 2;
    
    // map each 3D point to 2D with x and y coordinates
    konvaPoints = points.map(([x, y]: [number, number]) => ({
      x: (x - minX) * baseScale + offsetX,
      y: (y - minY) * baseScale + offsetY,
    }));

    // create the polyline as a closed shape
    const line = new Konva.Line({
      points: konvaPoints.flatMap((pt) => [pt.x, pt.y]),
      stroke: 'red',
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round',
      closed: true,
    });
    group.add(line);

    konvaPoints.forEach((pt, index) => {
      const circle = new Konva.Circle({
        x: pt.x,
        y: pt.y,
        radius: 5,
        fill: 'blue',
        stroke: 'white',
        strokeWidth: 1,
        draggable: true,
      });

      circle.on('dragmove', () => {
        konvaPoints[index] = { x: circle.x(), y: circle.y() };
        line.points(konvaPoints.flatMap((p) => [p.x, p.y]));
        layer.batchDraw();
      });
      group.add(circle);
    });

    layer.draw();

    const handleResize = () => {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
      layer.batchDraw();
    };
    window.addEventListener('resize', handleResize);
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  // update overlay whenever scaleFactor changes
  createEffect(() => {
    updateOverlay();
  });

  return (
    <>
      <div ref={container} style={{ width: '100vw', height: '100vh', background: 'transparent' }}></div>
      <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.01"
          value={scaleFactor()}
          onInput={(e: any) => setScaleFactor(parseFloat(e.target.value))}
        />
        <span>Scale: {scaleFactor().toFixed(2)}</span>
      </div>
    </>
  );
};

export default KonvaOverlay;
