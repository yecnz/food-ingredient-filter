// web-app/src/ImageUploader.js

import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = fileName;
            const file = new File([blob], fileName, { type: blob.type });
            resolve(file);
        }, 'image/jpeg');
    });
}

function ImageUploader({ onUploadSuccess, userSettings }) {
    
    const [croppedImageFile, setCroppedImageFile] = useState(null);
    const [croppedImagePreview, setCroppedImagePreview] = useState(null);
    
    const [originalImageSrc, setOriginalImageSrc] = useState(null);
    const [originalImageFile, setOriginalImageFile] = useState(null);
    
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const [isUploading, setIsUploading] = useState(false);
    

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setOriginalImageFile(file);
            setOriginalImageSrc(URL.createObjectURL(file));
            
            setIsCropModalOpen(true); 
            
            setCrop(centerCrop(
                makeAspectCrop({ unit: '%', width: 50 }, 1, 1, 1),
                1,
                1
            ));
        }
    };

    const handleCropConfirm = async () => {
        if (!completedCrop || !imgRef.current) {
            alert('이미지를 잘라낼 영역을 선택해주세요.');
            return;
        }

        try {
            const croppedFile = await getCroppedImg(
                imgRef.current,
                completedCrop,
                originalImageFile.name
            );
            
            setCroppedImageFile(croppedFile); 
            setCroppedImagePreview(URL.createObjectURL(croppedFile));

            setIsCropModalOpen(false);
            setOriginalImageSrc(null);
            setOriginalImageFile(null);

        } catch (e) {
            console.error('Crop failed', e);
            alert('이미지를 자르는 데 실패했습니다.');
        }
    };
    
    const handleUpload = async () => {
        if (!croppedImageFile) {
            alert('이미지를 먼저 선택하고 잘라주세요.');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('image', croppedImageFile);
            formData.append('settings', JSON.stringify(userSettings));
            
            const response = await fetch('http://localhost:5001/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                onUploadSuccess([
                    { status: 'danger', type: '서버 오류', ingredients: [errorData.message || '서버 오류'] }
                ]);
                return;
            }

            const result = await response.json();
            onUploadSuccess(result.analysisResult);

        } catch (error) {
            onUploadSuccess([
                { status: 'danger', type: '통신 오류', ingredients: [`Node.js 서버(5001번)가 켜져 있는지 확인하세요.`] }
            ]);
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleClearImage = () => {
        setCroppedImageFile(null);
        setCroppedImagePreview(null);
        document.getElementById('file-input').value = null;
    };


    return (
        <div className="image-uploader-container">
            
            <input 
                id="file-input"
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                disabled={isUploading} 
                style={{ display: 'none' }}
            />
            
            {!croppedImagePreview && (
                <>
                    <label htmlFor="file-input" className="custom-file-button">
                        성분표 이미지 선택하기
                    </label>
                </>
            )}

{croppedImagePreview && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>선택된 이미지 미리보기:</p>
                    
                    <img 
                        src={croppedImagePreview} 
                        alt="Cropped Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '200px', 
                            border: '1px solid #ddd', 
                            borderRadius: '4px',
                            marginBottom: '15px'
                        }}
                    />

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleUpload} disabled={isUploading} className="analyze-button">
                            {isUploading ? '분석 중...' : '선택 영역 분석하기'}
                        </button>
                        <button onClick={handleClearImage} disabled={isUploading} className="change-image-button">
                            다른 이미지 선택
                        </button>
                    </div>
                </div>
            )}

            {isCropModalOpen && (
                <div className="crop-modal-backdrop">
                    <div className="crop-modal-content">
                        <h2>이미지 자르기</h2>
                        <p>성분표 부분만 선택해주세요.</p>
                        <div className="crop-modal-cropper-container">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={null}
                            >
                                <img 
                                    ref={imgRef}
                                    src={originalImageSrc} 
                                    style={{ maxHeight: '50vh' }}
                                    alt="Crop target" 
                                />
                            </ReactCrop>
                        </div>
                        <div className="crop-modal-buttons">
                            <button onClick={handleCropConfirm} className="analyze-button">
                                자르기 확인
                            </button>
                            <button onClick={() => setIsCropModalOpen(false)} className="change-image-button">
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ImageUploader;