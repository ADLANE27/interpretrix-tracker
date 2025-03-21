
import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, RotateCcw, Save, Trash, ZoomIn, ZoomOut, Move } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DrawingCanvasProps {
  onChange: (data: string) => void;
  initialData?: string;
  className?: string;
}

export const DrawingCanvas = ({ onChange, initialData, className }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [erasing, setErasing] = useState<boolean>(false);
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Helper function to resize canvas
  const resizeCanvas = () => {
    if (canvas && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    }
  };

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const newCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: "#f8f9fa",
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    newCanvas.freeDrawingBrush.width = 2;
    newCanvas.freeDrawingBrush.color = currentColor;
    
    setCanvas(newCanvas);
    setDrawing(true);

    // Load initial data if provided
    if (initialData) {
      try {
        newCanvas.loadFromJSON(initialData, () => {
          newCanvas.renderAll();
        });
      } catch (error) {
        console.error("Error loading canvas data:", error);
      }
    }

    // Set up resize handler
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);
    // Initial resize after a delay to ensure parent has proper dimensions
    setTimeout(resizeCanvas, 100);

    // Set up onChange handler
    const handleCanvasChange = () => {
      const jsonData = JSON.stringify(newCanvas.toJSON());
      onChange(jsonData);
    };

    newCanvas.on("object:added", handleCanvasChange);
    newCanvas.on("object:modified", handleCanvasChange);
    newCanvas.on("object:removed", handleCanvasChange);

    // Set up mouse event handlers for panning
    newCanvas.on('mouse:down', (opt) => {
      if (isPanning && opt.e) {
        newCanvas.isDrawingMode = false;
        newCanvas.selection = false;
        newCanvas.isDragging = true;
        newCanvas.lastPosX = opt.e.clientX;
        newCanvas.lastPosY = opt.e.clientY;
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    });

    newCanvas.on('mouse:move', (opt) => {
      if (isPanning && newCanvas.isDragging && opt.e && lastPosRef.current) {
        const vpt = newCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += opt.e.clientX - lastPosRef.current.x;
          vpt[5] += opt.e.clientY - lastPosRef.current.y;
          newCanvas.requestRenderAll();
          lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        }
      }
    });

    newCanvas.on('mouse:up', () => {
      if (isPanning) {
        newCanvas.setViewportTransform(newCanvas.viewportTransform);
        newCanvas.isDragging = false;
        lastPosRef.current = null;
        
        // Don't automatically go back to drawing mode, let user toggle
        if (drawing && !isPanning) {
          newCanvas.isDrawingMode = true;
          newCanvas.selection = true;
        }
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      newCanvas.dispose();
    };
  }, []);

  // Handle color change
  useEffect(() => {
    if (canvas) {
      canvas.freeDrawingBrush.color = currentColor;
    }
  }, [currentColor, canvas]);

  // Handle drawing/erasing/panning mode
  useEffect(() => {
    if (!canvas) return;

    if (isPanning) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
    } else if (erasing) {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      // Save the current color
      const savedColor = canvas.freeDrawingBrush.color;
      // Set brush to white with higher width for erasing
      canvas.freeDrawingBrush.color = "#f8f9fa";
      canvas.freeDrawingBrush.width = 10;
      
      // Restore the original settings when exiting eraser mode
      return () => {
        if (canvas) {
          canvas.freeDrawingBrush.color = savedColor;
          canvas.freeDrawingBrush.width = 2;
        }
      };
    } else {
      canvas.isDrawingMode = drawing;
      canvas.selection = !drawing;
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = currentColor;
    }
  }, [drawing, erasing, isPanning, canvas, currentColor]);

  // Toggle drawing mode
  const toggleDrawing = () => {
    setDrawing(true);
    setErasing(false);
    setIsPanning(false);
  };

  // Toggle eraser mode
  const toggleEraser = () => {
    setErasing(prev => !prev);
    setDrawing(true);
    setIsPanning(false);
  };

  // Toggle pan mode
  const togglePan = () => {
    setIsPanning(prev => !prev);
    setErasing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = "#f8f9fa";
      canvas.renderAll();
    }
  };

  // Undo last action
  const undo = () => {
    if (canvas && canvas.getObjects().length > 0) {
      const objects = canvas.getObjects();
      canvas.remove(objects[objects.length - 1]);
    }
  };

  // Zoom in
  const zoomIn = () => {
    if (canvas) {
      const newZoom = zoom * 1.2;
      setZoom(newZoom);
      canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom);
      canvas.renderAll();
    }
  };

  // Zoom out
  const zoomOut = () => {
    if (canvas) {
      const newZoom = zoom / 1.2;
      setZoom(newZoom);
      canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom);
      canvas.renderAll();
    }
  };

  // Reset zoom and pan
  const resetView = () => {
    if (canvas) {
      setZoom(1);
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.renderAll();
    }
  };

  // Color options
  const colors = [
    { color: "#000000", name: "Black" },
    { color: "#0EA5E9", name: "Blue" },
    { color: "#10B981", name: "Green" },
    { color: "#8B5CF6", name: "Purple" },
    { color: "#F97316", name: "Orange" },
    { color: "#EF4444", name: "Red" },
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 bg-muted/50 p-2 rounded-md">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${drawing && !erasing && !isPanning ? "bg-muted" : ""}`}
            onClick={toggleDrawing}
            title="Pen"
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${erasing ? "bg-muted" : ""}`}
            onClick={toggleEraser}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${isPanning ? "bg-muted" : ""}`}
            onClick={togglePan}
            title="Pan"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={undo}
            title="Undo"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={clearCanvas}
            title="Clear"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={zoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={zoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 py-0 text-xs"
            onClick={resetView}
            title="Reset view"
          >
            {Math.round(zoom * 100)}%
          </Button>
        </div>

        <div className="flex gap-1">
          {colors.map((c) => (
            <button
              key={c.color}
              className={`w-6 h-6 rounded-full ${
                currentColor === c.color ? "ring-2 ring-offset-2 ring-primary" : ""
              }`}
              style={{ backgroundColor: c.color }}
              onClick={() => {
                setCurrentColor(c.color);
                setErasing(false);
                setDrawing(true);
                setIsPanning(false);
              }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="flex-1 relative w-full h-full bg-gray-100 rounded-md overflow-hidden"
        style={{ minHeight: "500px", flex: "1 1 auto" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
};
