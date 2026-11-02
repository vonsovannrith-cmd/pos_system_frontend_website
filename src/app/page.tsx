"use client";
import {useEffect, useState} from "react";

export default function Home() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:8080/api/health")
      .then((response) => response.json())
      .then((data) => setStatus(`${data.app}: ${data.status}`))
      .catch((error) => setStatus(`Error: ${error.message}`));
  }, []);

  return (
    <main>
      <h1>{status}</h1>
    </main>
  );
}
