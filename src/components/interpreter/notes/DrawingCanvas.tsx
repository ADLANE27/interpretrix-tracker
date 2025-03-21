
import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, RotateCcw, Save, Trash } from "lucide-react";

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
    setTimeout(resizeCanvas, 300);

    // Set up onChange handler
    const handleCanvasChange = () => {
      const jsonData = JSON.stringify(newCanvas.toJSON());
      onChange(jsonData);
    };

    newCanvas.on("object:added", handleCanvasChange);
    newCanvas.on("object:modified", handleCanvasChange);
    newCanvas.on("object:removed", handleCanvasChange);

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

  // Handle drawing/erasing mode
  useEffect(() => {
    if (!canvas) return;

    if (erasing) {
      canvas.isDrawingMode = true;
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
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = currentColor;
    }
  }, [drawing, erasing, canvas, currentColor]);

  // Toggle drawing mode
  const toggleDrawing = () => {
    setDrawing(true);
    setErasing(false);
  };

  // Toggle eraser mode
  const toggleEraser = () => {
    setErasing(prev => !prev);
    setDrawing(true);
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
            className={`h-8 w-8 p-0 ${drawing && !erasing ? "bg-muted" : ""}`}
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
              }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative w-full h-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
};
