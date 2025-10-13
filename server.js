// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


const groq = new Groq({
  apiKey: process.env.API_KEY,
});

async function callGROQLLM(question) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that provides clear and concise answers." 
        },
        { 
          role: "user", 
          content: question 
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    return response.choices[0]?.message?.content || "No answer found.";
  } catch (err) {
    console.error("GROQ LLM error:", err.message);
    return `Sorry, I couldn't process your request. Error: ${err.message}`;
  }
}

app.get("/", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

io.on("connection", (socket) => {

  socket.on("ask-question", async (question) => {
    if (!question || question.trim() === "") {
      socket.emit("answer", "⚠️ Please provide a valid question.");
      return;
    }


    try {
      socket.emit("status", "Thinking...");

      const answer = await callGROQLLM(question);

      socket.emit("answer", answer);
    } catch (error) {
      console.error(" Error processing question:", error);
      socket.emit("answer", "An unexpected error occurred. Please try again.");
    }
  });

  socket.on("disconnect", () => {
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});


// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});