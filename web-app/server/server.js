// web-app/server.js 

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); 

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = 5001; 

// --- Gemini API 및 DB 설정 ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DB_PATH = path.join(__dirname, 'recipeDB.json'); 

// --- 파일 업로드 설정 (OCR용) ---
const UPLOAD_DIR = path.join(__dirname, '..', 'image'); 

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); 
  },
  filename: (req, file, cb) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    cb(null, `${dateStr}_${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '업로드된 파일이 없습니다.' });
  }
  
  const userSettingsJson = req.body.settings;
  
  try {
      JSON.parse(userSettingsJson);
  } catch (e) {
      console.error("Failed to parse settings JSON:", e);
      return res.status(500).json({ success: false, message: '사용자 설정 데이터 오류.' });
  }

  // --- Python OCR 스크립트 실행 ---
  const pythonScriptPath = path.join(__dirname, '..', 'ingredient.py'); 
  // 본인 컴퓨터의 Python 경로가 맞는지 확인하세요!
  const pythonExecutable = '/Users/yeonji/Desktop/project/food-filter/venv/bin/python3'; 

  const spawnEnv = Object.assign({}, process.env, {
    PATH: `${process.env.PATH || ''}:/opt/homebrew/bin`
  });

  const pythonProcess = spawn(pythonExecutable, [
      pythonScriptPath, 
      userSettingsJson, 
      req.file.filename  
  ], {
      cwd: path.join(__dirname, '..'),
      env: spawnEnv
  });

  let pythonData = '';
  let pythonError = '';

  pythonProcess.stdout.setEncoding('utf8');
  pythonProcess.stderr.setEncoding('utf8');
  
  pythonProcess.stdout.on('data', (data) => {
    pythonData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`[Python Error] 스크립트 종료 코드: ${code}`);
      console.error(`[Python Stderr] ${pythonError}`);
      return res.status(500).json({ 
          success: false, 
          message: 'OCR 분석 중 오류가 발생했습니다.', 
          errorDetail: pythonError 
      });
    }

    try {
      const analysisResult = JSON.parse(pythonData.trim()); 
      console.log(`[Analysis Success] 결과 반환 완료`);
      
      res.json({
        success: true,
        message: '분석 완료. 결과를 확인하세요.',
        analysisResult: analysisResult
      });
      
    } catch (e) {
      console.error('Failed to parse Python output as JSON:', e);
      return res.status(500).json({ 
          success: false, 
          message: '분석 결과 파싱 오류.', 
          errorDetail: pythonData.trim() 
      });
    }
  });
});

app.post('/api/generate-menu', async (req, res) => {
  const preferences = req.body;
  // avoidedIngredients(기피 성분)를 받아서 처리
  const { category, flavor, temperature, form, avoidedIngredients } = preferences;

  console.log("AI 메뉴 생성 요청:", preferences);

  if (!category || !flavor || !temperature || !form) {
      return res.status(400).json({ error: '모든 선호도 조건이 필요합니다.' });
  }

  // 기피 성분 목록을 문자열로 변환
  const avoidString = avoidedIngredients && avoidedIngredients.length > 0 
      ? avoidedIngredients.join(', ') 
      : '없음';

  try {
      const prompt = `
          사용자 선호도에 맞는 독창적인 메뉴 3가지를 생성해줘.
          조건: 
          - 카테고리: ${category}
          - 맛: ${flavor}
          - 온도: ${temperature}
          - 형태: ${form}
          
          ⚠️ [매우 중요] 다음 재료나 성분은 메뉴에 절대 포함하지 마: ${avoidString}.
          이 재료들이 들어가지 않은, 알레르기로부터 안전한 메뉴를 추천해줘.
          
          반드시 다음 JSON 형식의 배열로만 응답해야 하며, 다른 설명은 포함하지 마.
          필수 필드: title, tags (배열), allergens (배열), category, flavor, temperature, form, style.
          flavor는 "${flavor}"에 해당하는 짧은 값(예: '매운 맛' -> '매움')으로 설정하고,
          temperature, category, form은 사용자가 요청한 긴 값 그대로 사용해야 해.
      `;

      const response = await ai.models.generateContent({
          model: 'gemini-pro', // 안정적인 1.5 모델 사용
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const jsonText = response.text.trim().replace(/^```json|```$/g, '').trim();
      const aiMenus = JSON.parse(jsonText);

      console.log(`[Gemini Success] ${aiMenus.length}개 메뉴 생성됨 (제외: ${avoidString})`);
      res.json(aiMenus);

  } catch (error) {
      console.error('Gemini API 호출 중 오류 발생:', error);
      res.status(500).json({ error: 'AI 메뉴 생성에 실패했습니다.' });
  }
});


const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("DB 파일 읽기 오류:", error);
        return [];
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("DB 파일 쓰기 오류:", error);
    }
};

app.post('/api/add-menu', (req, res) => {
    const newMenu = req.body;

    if (!newMenu || !newMenu.title) {
        return res.status(400).json({ error: '유효한 메뉴 데이터가 필요합니다.' });
    }

    const db = readDB();
    db.push(newMenu); 
    writeDB(db);      

    console.log(`[DB Write Success] ${newMenu.title} 메뉴 추가 완료.`);
    res.status(201).json({ success: true, message: '메뉴가 데이터베이스에 추가되었습니다.', menu: newMenu });
});

// --- 서버 실행 ---
app.listen(port, () => {
  console.log(`Node.js File/API Server running on port ${port}`);
});