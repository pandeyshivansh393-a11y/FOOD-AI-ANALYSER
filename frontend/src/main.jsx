import React from "react"; // Enable JSX in this small Vite setup.
import { createRoot } from "react-dom/client"; // Connect React to our HTML page.
import App from "./App.jsx"; // Import the app we wrote.
import "./style.css"; // Load the plain CSS stylesheet.
createRoot(document.getElementById("root")).render(<App />); // Draw the app inside the root div.
