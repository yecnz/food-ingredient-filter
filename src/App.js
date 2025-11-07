import { useState } from "react"; // 파일 선택 버튼 생성

function App() {
  const [image, setImage] = useState(null);

  // 파일 선택 시 실행
  const handleImageChange = (e) => {
    const file = e.target.files[0]; // 첫 번째 파일만
    if (file) {
      setImage(URL.createObjectURL(file)); // 미리보기 URL 생성
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>이미지 업로드 미리보기 🖼️</h1>

      {/* 파일 업로드 버튼 */}
      <input type="file" accept="image/*" onChange={handleImageChange} />

      {/* 이미지 미리보기 */}
      {image && (
        <div style={{ marginTop: "20px" }}>
          <h3>미리보기:</h3>
          <img
            src={image}
            alt="preview"
            style={{ width: "300px", border: "1px solid #ccc", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
}

export default App;