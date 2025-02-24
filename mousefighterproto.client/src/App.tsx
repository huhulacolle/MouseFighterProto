import { MouseEvent, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function App() {

  const disableRightClick = (e: MouseEvent<HTMLDivElement>) => e.preventDefault();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [OnCanva, setOnCanva] = useState<boolean | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [ConnexionLoading, setConnexionLoading] = useState(false);

  useEffect(() => {
    testConnect();
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("hub/MouseFighterHub") 
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log("Connecté au hub SignalR");
          setConnexionLoading(true);

          connection.on(
            "ReceiveDrawing",
            (
              prevPos: { x: number; y: number },
              currentPos: { x: number; y: number }
            ) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              ctx.beginPath();
              ctx.moveTo(prevPos.x, prevPos.y);
              ctx.lineTo(currentPos.x, currentPos.y);
              ctx.lineWidth = 5;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = "blue";
              ctx.stroke();
            }
          );
        })
        .catch((err) => {
          console.error("Erreur de connexion: ", err);
        });

        connection.on("ReceiveReset", () => {
          clearCanvas();
        })
    }
  }, [connection]);


  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (lastPos) {

      const deltaX = currentPos.x - lastPos.x;
      const deltaY = currentPos.y - lastPos.y;
  
      const newPos = { ...currentPos };
  
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newPos.x += deltaX > 0 ? 6 : -6;
      } else {
        newPos.y += deltaY > 0 ? 6 : -6;
      }
  
      const colorData = ctx.getImageData(newPos.x, newPos.y, 1, 1).data;

      if (colorData[2] > 0) {
        clearCanvas();
      }

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "red";
      ctx.stroke();

      if (connection) {
        connection
          .invoke("SendDrawing", lastPos, currentPos)
          .catch((err) =>
            console.error("Erreur lors de l'envoi du dessin: ", err)
          );
      }
    }

    setLastPos(currentPos);
  };

  const handleMouseLeave = () => {
    setLastPos(null);
    setOnCanva(false);
  };

  const handleMouseEnter = () => {
    setOnCanva(true);
  };

  const testConnect = async () => {
    const test = await fetch("/api/Test").then((e) => e.text());
    console.log(test);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col gap-5 items-center justify-center" onContextMenu={disableRightClick}>
      <div> {ConnexionLoading ? "Tu est connecté" : "Connexion en cours"} </div>
      <div>
        <input
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
          type="button"
          value="Reset arène"
          onClick={() => {
            if (connection) {
              connection
                .invoke("SendReset")
            }
            clearCanvas();
          }}
        />
      </div>
      <div>
        {" "}
        {OnCanva ? "Tu es dans l'arène" : "tu n'est pas dans l'arène"}{" "}
      </div>
      {ConnexionLoading ? (
        <canvas
          ref={canvasRef}
          width={1080}
          height={720}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="border w-[1080] h-[720]"
        />
      ) : (
        ""
      )}
    </div>
  );
}
