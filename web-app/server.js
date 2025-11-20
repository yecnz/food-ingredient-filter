// web-app/server.js 

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); 

const app = express();
const port = 5001; 

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

  // Node.js가 Tesseract(brew)를 찾도록 환경 변수(PATH)를 설정 (더 안전한 구문으로 변경)
  const spawnEnv = Object.assign({}, process.env, {
    PATH: `${process.env.PATH || ''}:/opt/homebrew/bin`
});

  const pythonProcess = spawn(pythonExecutable, [
      pythonScriptPath, 
      userSettingsJson, 
      req.file.filename  
  ], {
      cwd: path.join(__dirname, '..'),
      env: spawnEnv // 수정된 환경 변수(spawnEnv)를 적용
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

app.listen(port, () => {
  console.log(`Node.js File/API Server running on port ${port}`);
});