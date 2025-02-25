import { MouseEvent, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import Segment from "./interfaces/Segment";
import Position from "./interfaces/Position";

export default function App() {
  const MIN_SEGMENT_LENGTH = 6;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [lastPos, setLastPos] = useState<Position | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [ConnexionLoading, setConnexionLoading] = useState<boolean>(false);

  const segmentsRed = useRef<Segment[]>([]);
  const segmentsBlue = useRef<Segment[]>([]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("hub/MouseFighterHub")
      .withAutomaticReconnect()
      .build();

    setConnection(connection);

    connection.start().then(() => {
      setConnexionLoading(true);

      connection.on(
        "ReceiveDrawing",
        (prevPos: Position, currentPos: Position) => {
          drawSegment(prevPos, currentPos, "blue");
          segmentsBlue.current.push({
            x1: prevPos.x,
            y1: prevPos.y,
            x2: currentPos.x,
            y2: currentPos.y,
          });
        }
      );

      connection.on("ReceiveReset", clearCanvas);

      connection.on("ReceiveLost", () => {        
        alert("Tu a gagnés gg !!!");
      })
    });

    return () => {
      connection.stop();
    };
  }, []);

  const drawSegment = (start: Position, end: Position, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const distance = (p1: Position, p2: Position) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  };

  const intersectSegments = (
    A: Position,
    B: Position,
    C: Position,
    D: Position
  ): boolean => {
    const det = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);
    if (det === 0) return false;

    const lambda =
      ((D.y - C.y) * (D.x - A.x) + (C.x - D.x) * (D.y - A.y)) / det;
    const gamma = ((A.y - B.y) * (D.x - A.x) + (B.x - A.x) * (D.y - A.y)) / det;

    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  };

  const checkCollision = (
    newSegment: Segment,
    segmentsOpponent: Segment[]
  ): boolean => {
    return segmentsOpponent.some((segment) =>
      intersectSegments(
        { x: newSegment.x1, y: newSegment.y1 },
        { x: newSegment.x2, y: newSegment.y2 },
        { x: segment.x1, y: segment.y1 },
        { x: segment.x2, y: segment.y2 }
      )
    );
  };

  const handleMouseMove = async (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (
      lastPos &&
      connection &&
      distance(lastPos, currentPos) > MIN_SEGMENT_LENGTH
    ) {
      const newSegment: Segment = {
        x1: lastPos.x,
        y1: lastPos.y,
        x2: currentPos.x,
        y2: currentPos.y,
      };

      if (checkCollision(newSegment, segmentsBlue.current)) {
        await connection.invoke("SendLost");
        clearCanvas();
        alert("tu as perdu !");
        connection.invoke("SendReset");
        return;
      }

      drawSegment(lastPos, currentPos, "red");
      segmentsRed.current.push(newSegment);

      connection
        .invoke("SendDrawing", lastPos, currentPos)
        .catch(console.error);

      setLastPos(currentPos);
    } else if (!lastPos) {
      setLastPos(currentPos);
    }
  };

  const handleMouseLeave = () => setLastPos(null);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    segmentsRed.current = [];
    segmentsBlue.current = [];
  };

  return (
    <div
      className="flex flex-col gap-5 items-center justify-center"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div>{ConnexionLoading ? "Tu es connecté" : "Connexion en cours"}</div>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
        onClick={() => {
          connection?.invoke("SendReset");
          clearCanvas();
        }}
      >
        Reset arène
      </button>
      {ConnexionLoading && (
        <canvas
          ref={canvasRef}
          width={1080}
          height={720}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="border cursor-none"
        />
      )}
    </div>
  );
}
