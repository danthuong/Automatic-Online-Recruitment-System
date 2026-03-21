import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# 1. CẤU HÌNH THƯ MỤC CHỨA MODEL (Rất quan trọng)
# ==========================================
# Lấy thư mục hiện tại của file face_api.py
current_dir = os.path.dirname(os.path.abspath(__file__))
# Ghép với tên thư mục 'models'
models_dir = os.path.join(current_dir, "models")

# ÉP DeepFace dùng thư mục models làm nhà chính
os.environ["DEEPFACE_HOME"] = models_dir

# Chỉ import DeepFace SAU KHI đã set biến môi trường
from deepface import DeepFace

# Tạo sẵn cây thư mục nếu bác chưa tạo, tránh lỗi ngớ ngẩn
target_weight_dir = os.path.join(models_dir, ".deepface", "weights")
os.makedirs(target_weight_dir, exist_ok=True)
print(f"👉 Vui lòng đảm bảo 2 file (.h5) đã nằm trong thư mục này:\n{target_weight_dir}")

# ==========================================
# 2. CẤU HÌNH PINECONE VÀ APP
# ==========================================
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("INDEX_NAME")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

app = FastAPI(title="Proctoring Face Recognition API")

# Mồi sẵn DeepFace khi server vừa chạy để nó khỏi bị giật lag ở request đầu tiên
@app.on_event("startup")
async def startup_event():
    print("⏳ Đang mồi AI, load weights từ ổ cứng...")
    # Thử gọi đại một hàm rẻ tiền để ép nó load model
    try:
        DeepFace.build_model("Facenet512")
        print("✅ AI đã load xong, server sẵn sàng nhận ảnh!")
    except Exception as e:
        print(f"❌ Có lỗi khi load AI: {str(e)}")

# ==========================================
# 3. HÀM HỖ TRỢ: TRÍCH XUẤT EMBEDDING (ĐỌC TỪ FILE)
# ==========================================
def get_face_embedding(img_path: str):
    try:
        results = DeepFace.represent(
            img_path=img_path, 
            model_name="Facenet512", 
            detector_backend="retinaface", 
            enforce_detection=True,
            align=True 
        )
        return results[0]["embedding"]
    except ValueError as e:
        print(f"\n[!!!] DEEPFACE BÁO LỖI: {str(e)}\n")
        raise HTTPException(status_code=400, detail="Không tìm thấy khuôn mặt trong ảnh.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi trích xuất khuôn mặt: {str(e)}")

# ==========================================
# API 1: ĐĂNG KÝ KHUÔN MẶT
# ==========================================
@app.post("/register_face")
async def register_face(
    student_id: str = Form(...), 
    file: UploadFile = File(...)
):
    # Dùng file tạm thay cho OpenCV để chống mọi loại lỗi
    temp_path = f"temp_reg_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        embedding = get_face_embedding(temp_path)
        
        index.upsert(
            vectors=[
                {
                    "id": student_id, 
                    "values": embedding,
                    "metadata": {"status": "registered"} 
                }
            ]
        )
        return {"status": "success", "message": f"Đã đăng ký khuôn mặt cho sinh viên {student_id}"}
    finally:
        # Code chạy xong thì xóa luôn cái file tạm cho sạch máy
        if os.path.exists(temp_path):
            os.remove(temp_path)

# ==========================================
# API 2: XÁC THỰC KHUÔN MẶT 
# ==========================================
@app.post("/verify_face")
async def verify_face(
    student_id: str = Form(...), 
    file: UploadFile = File(...)
):
    temp_path = f"temp_ver_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        current_embedding = get_face_embedding(temp_path)
        
        query_response = index.query(
            vector=current_embedding,
            top_k=1,
            include_metadata=True
        )
        
        matches = query_response.get("matches", [])
        if not matches:
            return {"verified": False, "message": "Không có dữ liệu trong Database."}
        
        best_match = matches[0]
        matched_id = best_match["id"]
        similarity_score = best_match["score"] 
        
        THRESHOLD = 0.6
        
        if matched_id == student_id and similarity_score >= THRESHOLD:
            return {"verified": True, "similarity": round(similarity_score, 4), "message": "Xác thực thành công!"}
        elif matched_id != student_id and similarity_score >= THRESHOLD:
            return {"verified": False, "similarity": round(similarity_score, 4), "message": f"Gian lận! Người ngồi thi là {matched_id}, không phải {student_id}"}
        else:
            return {"verified": False, "similarity": round(similarity_score, 4), "message": "Khuôn mặt không khớp với cơ sở dữ liệu."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)