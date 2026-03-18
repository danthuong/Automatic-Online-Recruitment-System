# Automatic-Online-Recruitment-System

```
auto-recruit-system/
│
├── 🌐 web-portal/                # Next.js / React
│   ├── src/
│   │   ├── components/           # UI components (Button, Modal,...)
│   │   ├── pages/
│   │   │   ├── hr/               # HR Dashboard (Xem list CV, config job, report)
│   │   │   └── candidate/        # Nơi ứng viên upload CV
│   │   └── services/             # Call API tới Backend
│   ├── package.json
│   └── .env                      
│
├── ⚙️ backend-core/              # Python FastAPI + Celery
│   ├── app/
│   │   ├── api/                  # Các endpoint API (RESTful)
│   │   ├── core/                 # Config database, security JWT
│   │   ├── models/               # Database Schema (PostgreSQL)
│   │   ├── services/             # LLM Services (Ranking CV, Gen Test Matrix)
│   │   └── worker/               # Celery Tasks (Chạy ngầm xếp queue, gửi mail)
│   ├── main.py                   # File chạy server FastAPI
│   ├── requirements.txt
│   └── .env
│
├── 🛡️ electron-client/           # Electron + React/Vanilla
│   ├── src/
│   │   ├── main/                 # [Node.js] OS LEVEL
│   │   │   ├── security/         # Chứa script C++ Hooking (chặn Alt+Tab, Kiosk mode)
│   │   │   ├── process_killer.js # Script quét tasklist kill AnyDesk/TeamViewer
│   │   │   └── main.js           # Khởi tạo cửa sổ Electron
│   │   │
│   │   ├── renderer/             # [Web/React UI] Giao diện bài thi
│   │   │   ├── components/       # UI câu hỏi (Code Editor, Trắc nghiệm)
│   │   │   ├── ai_models/        # Chứa code MediaPipe Face Mesh & Speech Recog
│   │   │   └── app.jsx           # Render giao diện chính
│   │   │
│   │   └── shared/               # File IPC (giao tiếp giữa Main và Renderer)
│   ├── package.json
│   └── build_config.json
│
├── 🧠 ai-research/               # (Tùy chọn) Thư mục dùng để test prompt/train model
│   ├── notebooks/                # Jupyter Notebook test thử MediaPipe/Heuristic
│   └── dataset/                  # (Nếu team quyết định train model riêng)
│
├── docker-compose.yml            # File cực kỳ quan trọng để boot Redis + PostgreSQL cho team test local
└── README.md
```
