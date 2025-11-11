// web-app/server.js

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); 

const app = express();
const port = 5000; 

// 파일 저장 경로 설정 (food-filter/image)
const UPLOAD_DIR = path.join(__dirname, '..', 'image'); 

// image 폴더가 없으면 생성
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); // 이미지를 저장할 경로
  },
  filename: (req, file, cb) => {
    // 파일명: yyyymmdd_originalname.jpg 형식으로 저장
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    cb(null, `${dateStr}_${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// --- 이미지 업로드 처리 API ---
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
  
  // 1. Python 스크립트 경로 설정 (food-filter/ingredient.py)
  const pythonScriptPath = path.join(__dirname, '..', 'ingredient.py'); 
  
  // 2. Python 실행 명령어 설정 (Mac용)
  const pythonExecutable = 'python3'; 

  // 3. Python 스크립트를 실행하고, 사용자 설정(JSON 문자열)과 파일명을 인자로 전달
  const pythonProcess = spawn(pythonExecutable, [
      pythonScriptPath, 
      userSettingsJson, // Python 스크립트에서 첫 번째 인자로 받음
      req.file.filename // Python 스크립트에서 두 번째 인자로 받음
  ], {
      cwd: path.join(__dirname, '..') // 실행 경로를 food-filter로 설정
  });

  let pythonData = '';
  let pythonError = '';

  pythonProcess.stdout.setEncoding('utf8');
  pythonProcess.stderr.setEncoding('utf8');
  
  // Python 스크립트의 표준 출력(print)을 수신
  pythonProcess.stdout.on('data', (data) => {
    pythonData += data.toString();
  });

  // Python 스크립트의 표준 에러(에러 로그)를 수신
  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
  });

  // Python 스크립트 실행이 완료되면
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      // Python 실행 중 오류 발생
      console.error(`[Python Error] 스크립트 종료 코드: ${code}`);
      console.error(`[Python Stderr] ${pythonError}`);
      return res.status(500).json({ 
          success: false, 
          message: 'OCR 분석 중 오류가 발생했습니다.', 
          errorDetail: pythonError 
      });
    }

    try {
      // Python 스크립트의 최종 출력(JSON 형식)을 파싱
      const analysisResult = JSON.parse(pythonData.trim()); 
      
      console.log(`[Analysis Success] 결과 반환: ${JSON.stringify(analysisResult)}`);
      
      // 최종 결과를 React 앱으로 전송
      res.json({
        success: true,
        message: '분석 완료. 결과를 확인하세요.',
        analysisResult: analysisResult // Python에서 받은 분석 결과
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