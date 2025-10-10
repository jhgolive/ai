// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => res.send("Nightbot AI API Running"));

app.get("/chat", async (req, res) => {
  const query = req.query.query; // Nightbot이 보낸 질문
  if (!query) return res.send("질문을 입력해주세요.");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 빠르고 저렴한 모델
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "응답이 없습니다.";
    res.send(answer);
  } catch (e) {
    console.error(e);
    res.send("AI 서버 오류가 발생했습니다.");
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
