# food-filter/ocr.py 

import cv2
import pytesseract
import os
import re
import sys 
import json 
from Levenshtein import distance 
from database import MASTER_DB_LIST

# --- [설정 1] Tesseract 경로 ---
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract" # ⚠️ Mac 경로

# --- [설정 2] 폴더 설정 ---
BASE_DIR = os.path.expanduser("~/Desktop/project/food-filter") # ⚠️ Mac 경로
IMAGE_DIR = os.path.join(BASE_DIR, "image")
RESULT_DIR = os.path.join(BASE_DIR, "result") 

os.makedirs(RESULT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True) 

# --- [설정 3] OCR 설정 ---
OCR_CONFIG = '--oem 3 --psm 3' 
def preprocess_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8)
    return binary

def correct_word_with_db(word, db):
    word_len = len(word)
    threshold = max(1, word_len // 4 + 1)
    min_dist = float('inf')
    best_match = word
    for correct_word in db:
        if abs(len(correct_word) - word_len) > threshold:
             continue
        dist = distance(word, correct_word)
        if dist < min_dist:
            min_dist = dist
            best_match = correct_word
    if min_dist <= threshold:
        return best_match
    else:
        return word 

def postprocess_text(text):
    words = re.split(r'([,\s\(\)])', text)
    corrected_words = []
    for word in words:
        if re.match(r'^[가-힣]{2,}$', word):
            corrected_word = correct_word_with_db(word, MASTER_DB_LIST) 
            corrected_words.append(corrected_word)
        else:
            corrected_words.append(word)
    corrected_text = "".join(corrected_words)
    lines = corrected_text.split('\n')
    filtered_lines = [line.strip() for line in lines if len(line.strip()) > 1]
    return '\n'.join(filtered_lines)

# ===== [★핵심★] 1. 부품 함수 생성 =====
def process_image_to_text(image_path):
    """
    (이 함수가 test.py가 찾는 함수입니다)
    이미지 경로 1개를 받아서, OCR이 완료된 텍스트 1개를 반환(return)합니다.
    """
    img_original = cv2.imread(image_path)
    if img_original is None: 
        print(f"[오류] 이미지를 읽을 수 없습니다: {image_path}")
        return None 
    
    processed_image = preprocess_for_ocr(img_original)
    raw_text = pytesseract.image_to_string(processed_image, lang="kor", config=OCR_CONFIG)
    corrected_text = postprocess_text(raw_text)
    
    return corrected_text 

# --- 메인 처리 루프 ---
def main():
    img_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if not img_files:
        # ❗️ ocr.py를 단독 실행하면 이 메시지가 떠야 합니다.
        print(f"[!] '{IMAGE_DIR}' 폴더에 이미지 파일이 없습니다. 이미지 파일을 이 폴더에 넣어주세요.")
        return

    for img_name in img_files:
        full_path = os.path.join(IMAGE_DIR, img_name)
        img_original = cv2.imread(full_path)
        if img_original is None: continue
        
        print(f"--- 처리 중: {img_name} ---")
        
        corrected_text = process_image_to_text(full_path) # 함수 재사용
        
        base_name = os.path.splitext(img_name)[0]
        output_filename = f"{base_name}_ocr.txt" 
        output_path = os.path.join(RESULT_DIR, output_filename)
        
        if corrected_text:
            try:
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(corrected_text)
                print(f" 교정된 텍스트 저장 완료: {output_filename}")
            except Exception as e: 
                print(f" 파일 저장 중 에러 발생: {e}")
        else:
            print(" OCR 결과가 비어있어 저장하지 않습니다.")


if __name__ == "__main__":
    main()