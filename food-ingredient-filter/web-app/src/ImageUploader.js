// web-app/src/ImageUploader.js

import { useState } from "react"; 

// userSettings를 props로 받도록 하고, export default를 함수 정의와 함께 사용
export default function ImageUploader({ onUploadSuccess, userSettings }) { 
    const [image, setImage] = useState(null); 
    const [uploadMessage, setUploadMessage] = useState('이미지를 선택하여 분석을 시작하세요.');
    const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

    const handleImageChange = async (e) => {
        const file = e.target.files[0]; 
        
        if (!file) return;

        // 1. 이미지 미리보기 설정 및 로딩 시작
        setImage(URL.createObjectURL(file));
        setUploadMessage('이미지 업로드 중... 서버에서 분석 요청을 대기하고 있습니다.');
        setIsLoading(true);

        // 2. FormData 객체 생성 및 데이터 추가
        const formData = new FormData();
        formData.append('image', file);
        // userSettings 객체를 JSON 문자열로 변환하여 전달 (App.js에서 받아온 데이터)
        formData.append('settings', JSON.stringify(userSettings)); 

        try {
            // 3. 서버에 POST 요청 (Node.js 서버)
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
            }

            const data = await response.json();
            
            // 4. 결과 처리 및 App.js로 전달
            if (data.success && data.analysisResult) { 
                setUploadMessage(`분석 완료!`);
                
                // App.js의 handleUploadSuccess 함수로 분석 결과 전달
                if (onUploadSuccess) {
                    onUploadSuccess(data.analysisResult); 
                }

            } else if (data.success) {
                 setUploadMessage(`⚠️ 파일은 저장되었으나 분석 결과가 누락되었습니다.`);
            } else {
                setUploadMessage(`❌ 업로드 실패: ${data.message}`);
                console.error("Server Error Detail:", data.errorDetail);
            }

        } catch (error) {
            console.error('업로드 중 통신 오류:', error);
            setUploadMessage(`❌ 통신 오류 발생: Node.js 서버(5000번)가 켜져 있는지 확인하세요.`);
        } finally {
            setIsLoading(false);
        }
    }; 

    return ( 
        <div style={{ padding: "20px", textAlign: 'center' }}> 
            <p style={{ color: isLoading ? '#3498db' : (uploadMessage.includes('❌') ? '#e74c3c' : '#2ecc71'), fontWeight: 'bold' }}>
                {uploadMessage}
            </p>
            
            <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                disabled={isLoading}
                style={{ 
                    display: 'block', 
                    margin: '10px auto 20px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px'
                }}
            /> 
            
            {/* 로딩 인디케이터 */}
            {isLoading && (
                <div style={{ margin: '15px 0', fontSize: '1.2rem', color: '#3498db' }}>
                    잠시만 기다려 주세요... 분석 중입니다.
                </div>
            )}
            
            {image && ( 
                <div style={{ marginTop: "20px" }}> 
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>선택된 이미지 미리보기:</h3> 
                    <img 
                        src={image} 
                        alt="preview" 
                        style={{ 
                            maxWidth: "100%", 
                            maxHeight: "300px", 
                            objectFit: "contain",
                            border: "2px solid #3498db", 
                            borderRadius: "8px", 
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                        }} 
                    /> 
                </div> 
            )} 
        </div> 
    ); 
}