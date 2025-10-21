import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MEMORY_DIR = path.resolve("./memory");
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR);

// 유저별 기억 불러오기
function loadMemory(user) {
  const file = path.join(MEMORY_DIR, `${user}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } else {
    const baseMemory = {
      name: "티티",
      userSet: false,
      chatHistory: [
        { role: "system", content: "너의 이름은 티티. 간결하게 대답해." },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(baseMemory, null, 2));
    return baseMemory;
  }
}

// 기억 저장
function saveMemory(user, memory) {
  const file = path.join(MEMORY_DIR, `${user}.json`);
  fs.writeFileSync(file, JSON.stringify(memory, null, 2));
}

app.get("/", (req, res) => res.send("🧠 Nightbot AI Memory Server Running"));

// AI 채팅
app.get("/chat", async (req, res) => {
  const user = req.query.user?.trim();
  const query = req.query.query?.trim();
  if (!user) return res.send("user 파라미터가 필요합니다.");
  if (!query) return res.send("query 파라미터가 필요합니다.");

  const memory = loadMemory(user);

  if (!memory.userSet) {
    memory.chatHistory.push({
      role: "system",
      content: `사용자 이름은 ${user}입니다.`,
    });
    memory.userSet = true;
  }

  memory.chatHistory.push({ role: "user", content: `${user}: ${query}` });

  try {
    const recentMessages = memory.chatHistory.slice(-1); // 이전 대화 1개 보내기
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: recentMessages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error(data.error);
      return res.send("❌ OpenAI 오류: " + data.error.message);
    }

    const answer = data.choices?.[0]?.message?.content || "응답이 없습니다.";
    memory.chatHistory.push({ role: "assistant", content: answer });
    saveMemory(user, memory);

    res.send(answer);
  } catch (err) {
    console.error(err);
    res.send("AI 서버 오류가 발생했습니다.");
  }
});

// 이름 변경
app.get("/setname", (req, res) => {
  const user = req.query.user?.trim();
  const newName = req.query.name?.trim();
  if (!user || !newName) return res.send("예: /setname?user=쩡햄&name=티티");

  const memory = loadMemory(user);
  memory.name = newName;
  memory.chatHistory.push({
    role: "system",
    content: `너의 이름은 이제 ${newName}야.`,
  });
  saveMemory(user, memory);

  res.send(`${user}님의 AI 이름이 "${newName}"로 설정되었습니다.`);
});

// 기억 초기화
app.get("/forget", (req, res) => {
  const user = req.query.user?.trim();
  if (!user) return res.send("예: /forget?user=쩡햄");

  const file = path.join(MEMORY_DIR, `${user}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);

  res.send(`${user}님의 기억이 초기화되었습니다.`);
});

// 모든 기억 초기화
app.get("/forgetall", (req, res) => {
  if (!fs.existsSync(MEMORY_DIR)) return res.send("기억 디렉토리가 존재하지 않습니다.");

  const files = fs.readdirSync(MEMORY_DIR);
  if (files.length === 0) return res.send("🗑️ 삭제할 기억이 없습니다.");

  files.forEach(file => fs.unlinkSync(path.join(MEMORY_DIR, file)));
  res.send("모든 유저의 기억이 초기화되었습니다.");
});

app.listen(3000, () => console.log("✅ Server started on port 3000"));
