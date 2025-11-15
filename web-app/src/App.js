// web-app/src/App.js

import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import AnalysisModal from './AnalysisModal';
import './App.css';

const CHECKBOX_OPTIONS = {
"알레르기": ["밀", "대두", "땅콩", "우유", "계란", "새우", "게", "닭고기", "쇠고기", "돼지고기"],
"기타기피": ["MSG", "사카린", "아스파탐", "수크랄로스"]
};

function App() {
  const [checkedAllergens, setCheckedAllergens] = useState([]); // 알레르기 성분 (알레르기)
  const [checkedEtc, setCheckedEtc] = useState([]);           // 기타 기피 성분 (기타기피)
  const [isVegan, setIsVegan] = useState(false);              // 비건 여부 (비건)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);

  // OCR 분석 결과 (더미 데이터 - 실제 서버에서 받아야 함)
  const dummyAnalysisResults = [
    { status: "safe", message: "성분 중 '정제수', '백설탕' 등이 포함되어 있습니다." },
    { status: "warning", message: "성분 중 '대두'가 검출되었습니다." },
    { status: "safe", message: "성분 중 '옥수수전분', '카놀라유' 등이 포함되어 있습니다." }
  ];

// --- 이벤트 핸들러 ---
  
  // 일반 체크박스 (알레르기/기타기피) 변경 핸들러
  const handleCheckboxChange = (event, category) => {
    const value = event.target.value;
    const isChecked = event.target.checked;
    
    // 상태 업데이트 함수 선택
    const setter = category === "알레르기" ? setCheckedAllergens : setCheckedEtc;
    
    setter(prev => {
        if (isChecked) {
            return [...prev, value]; // 체크 시 추가
        } else {
            return prev.filter(item => item !== value); // 체크 해제 시 제거
        }
    });
  };

  // 비건 체크박스 변경 핸들러
  const handleVeganChange = (event) => {
      setIsVegan(event.target.checked);
  };
  
  // 이미지 업로드 성공 후 모달 열기 핸들러 (ImageUploader 컴포넌트에 전달)
  const handleUploadSuccess = (results) => { 
    setAnalysisResults(results); // 서버에서 받은 실제 결과로 상태 업데이트
    setIsModalOpen(true);        // 팝업 열기
  };


  // --- 사용자 설정 데이터 통합 ---
  // Python 코드가 요구하는 최종 user_settings 딕셔너리 구조
  const userSettingsData = {
      "알레르기": checkedAllergens,
      "비건": isVegan,
      "기타기피": checkedEtc
  };

  return (
    <div className="App"> 
       <h1>이건 먹어도대~ 🍎 🍜 🍤</h1>
      
      {/* 1. 알레르기 체크 섹션 */}
      <section>
        <h2> 필터링 성분 설정</h2>
        
        {/* 비건 체크박스 */}
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', color: isVegan ? '#2c3e50' : '#777' }}>
                <input
                    type="checkbox"
                    checked={isVegan}
                    onChange={handleVeganChange}
                    style={{ marginRight: '10px' }}
                />
                동물성 성분 필터링 (비건)
            </label>
        </div>

        {/* 알레르기 및 기타 기피 성분 체크박스 */}
        {Object.entries(CHECKBOX_OPTIONS).map(([category, options]) => (
    <fieldset key={category} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}> {/* fieldset 사용 */}
        <legend style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '0 10px' }}> {/* legend 사용 */}
            {category === "알레르기" ? "알레르기 유발 성분" : "첨가물/기타 기피 성분"}
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
            {options.map(item => (
                <label key={item} style={{ fontSize: '1.1rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        value={item}
                        onChange={(e) => handleCheckboxChange(e, category)}
                        style={{ marginRight: '5px' }}
                    />
                    {item}
                </label>
            ))}
        </div>
    </fieldset>
))}

        <p style={{ marginTop: '20px', fontWeight: 'bold', color: '#555' }}>
            현재 필터링 설정: 
            [알레르기: {checkedAllergens.join(', ') || '없음'}] 
            [기타: {checkedEtc.join(', ') || '없음'}] 
            [비건: {isVegan ? '활성화' : '비활성화'}]
        </p>
      </section>

      {/* 2. 이미지 업로드 섹션 */}
      <section className="image-uploader-container">
        <h2>성분표 이미지를 업로드해주세요</h2>
        {/* userSettingsData를 ImageUploader에 전달 */}
        <ImageUploader 
            onUploadSuccess={handleUploadSuccess} 
            userSettings={userSettingsData} 
        /> 
      </section>

      {/* 3. 분석 결과 팝업 */}
      <AnalysisModal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        results={analysisResults}
        checkedIngredients={checkedAllergens} 
      />
    </div>
  );
}

export default App;