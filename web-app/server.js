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

// --- Gemini API 초기화 ---
// .env 파일에서 키를 읽어와 사용합니다.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 
const DB_PATH = path.join(__dirname, 'recipeDB.json'); // DB 파일 경로 정의 (server 폴더 기준)

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
        console.log(`[Analysis Success] 결과 반환: ${JSON.stringify(analysisResult)}`);
        
        res.json({
          success: true,
          message: '분석 완료. 결과를 확인하세요.',
          analysisResult: analysisResult
        });
        
      } catch (e) {
        console.error('Failed to parse Python output as JSON:', e);
        console.error('Raw Python Output:', pythonData);
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
    const { category, flavor, temperature, form } = preferences;

    if (!category || !flavor || !temperature || !form) {
        return res.status(400).json({ error: '모든 선호도 조건이 필요합니다.' });
    }

    try {
        const prompt = `
            사용자 선호도에 맞는 독창적인 메뉴 3가지를 생성해줘.
            조건: 카테고리: ${category}, 맛: ${flavor}, 온도: ${temperature}, 형태: ${form}.
            
            반드시 다음 JSON 형식의 배열로만 응답해야 하며, 다른 설명은 포함하지 마.
            필수 필드: title, tags (배열), allergens (배열), category, flavor, temperature, form, style.
            flavor는 "${flavor}"에 해당하는 짧은 값(예: '매운 맛' -> '매움')으로 설정하고,
            temperature, category, form은 사용자가 요청한 긴 값 그대로 사용해야 해.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // 텍스트 응답에서 JSON 코드 블록을 추출하고 정리
        const jsonText = response.text.trim().replace(/^```json|```$/g, '').trim();
        const aiMenus = JSON.parse(jsonText);

        console.log(`[Gemini Success] ${aiMenus.length}개 메뉴 생성됨.`);
        res.json(aiMenus);

    } catch (error) {
        console.error('Gemini API 호출 중 오류 발생:', error);
        res.status(500).json({ error: 'AI 메뉴 생성에 실패했습니다.' });
    }
});

// DB 유틸리티 함수 (서버 내에서만 사용)
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 파일이 없으면 빈 배열 반환
        if (error.code === 'ENOENT') { 
            return [];
        }
        console.error("DB 파일 읽기 오류:", error);
        return [];
    }
};

const writeDB = (data) => {
    try {
        // JSON을 예쁘게 포맷팅하여 저장 (null, 2)
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
    db.push(newMenu); // 새 메뉴 추가
    writeDB(db);    // 파일에 저장

    console.log(`[DB Write Success] ${newMenu.title} 메뉴 추가 완료.`);
    res.status(201).json({ success: true, message: '메뉴가 데이터베이스에 성공적으로 추가되었습니다.', menu: newMenu });
});

app.listen(port, () => {
  console.log(`Node.js File/API Server running on port ${port}`);
});