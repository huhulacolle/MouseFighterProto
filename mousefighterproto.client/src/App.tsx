import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [OnCanva, setOnCanva] = useState<boolean | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [ConnexionLoading, setConnexionLoading] = useState(false);
  const [ConnexionError, setConnexionError] = useState("");

  // Initialisation de la connexion SignalR
  useEffect(() => {
    testConnect();
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("hub/MouseFighterHub") // URL de votre hub SignalR
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    // Arrêter la connexion lors du démontage du composant
    return () => {
      newConnection.stop();
    };
  }, []);

  // Démarrer la connexion et enregistrer l'écouteur pour les messages de dessin provenant d'autres utilisateurs
  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log("Connecté au hub SignalR");
          setConnexionLoading(true);

          // Écoute des messages de dessin envoyés par d'autres utilisateurs
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
              ctx.strokeStyle = "blue"; // Trait bleu pour les dessins des autres utilisateurs
              ctx.stroke();
            }
          );
        })
        .catch((err) => {
          console.error("Erreur de connexion: ", err);
          setConnexionError(JSON.stringify(err));
        });
    }
  }, [connection]);

  // Gestion du déplacement de la souris pour dessiner localement et envoyer les données de dessin
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
      // Dessin local (trait rouge)
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "red";
      ctx.stroke();

      // Envoi des données de dessin au hub SignalR
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
  }

  return (
    <div className="flex flex-col gap-5 items-center justify-center">
      <div>
        {" "}
        {ConnexionLoading ? "Tu est connecté" : "Connexion en cours"}{" "}
        {ConnexionError}
      </div>
      <div>
        {" "}
        {OnCanva ? "Tu est dans l'arène" : "tu n'est pas dans l'arène"}{" "}
      </div>
      {ConnexionLoading ? (
        <canvas
          ref={canvasRef}
          width={1080}
          height={720}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="border w-[1080] h-[720] cursor-none"
        />
      ) : (
        ""
      )}
    </div>
  );
}
