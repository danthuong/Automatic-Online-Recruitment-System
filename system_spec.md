# Software Specification: Automatic Online Recruitment System (Anti-Cheat)

## 1. Kiến trúc Hệ thống (System Architecture)

Dự án sẽ được chia thành 4 phân hệ chính:
1. **Web Portal (Frontend):** Dành cho Ứng viên (nộp CV) và Nhân sự/HR (quản lý chiến dịch, xem report).
2. **Core Backend (API & Orchestrator):** Quản lý luồng dữ liệu, hàng đợi (queue), và kết nối các dịch vụ AI.
3. **AI Engine (NLP & CV):** Xử lý ngôn ngữ tự nhiên (đọc CV, tạo bài test, chấm điểm) và xử lý ảnh/âm thanh (Proctoring).
4. **Electron Client (Desktop App):** Môi trường làm bài thi Anti-cheat.

---

## 2. Chi tiết Pipeline & Giải pháp Kỹ thuật

### Bước 1: Parse CV & Ranking ("Wow" Score)
* **Luồng hoạt động:** Ứng viên upload CV (PDF/Docx). Backend bóc tách dữ liệu (Extract).
* **Giải pháp:** Sử dụng LLM (Large Language Model) thông qua API (OpenAI GPT-4o hoặc Claude 3.5) để trích xuất kỹ năng, số năm kinh nghiệm, và dự án. 
* **Scoring:** Xây dựng một hàm đánh giá (Scoring Function) để tính điểm "Wow".
  Trọng số có thể được định nghĩa bằng công thức:
  $S_{wow} = (w_1 \cdot E) + (w_2 \cdot K) + (w_3 \cdot P)$
  *(Trong đó E là kinh nghiệm, K là độ hiếm của kỹ năng, P là quy mô/độ phức tạp của dự án, w là trọng số do HR cài đặt).*

### Bước 2: Queue Management & Notification
* **Luồng hoạt động:** Lấy Top N (ví dụ: 10) ứng viên đẩy vào một `Testing_Queue`. Hệ thống tự động gửi email (chứa Test ID và Link tải App).
* **Giải pháp:** Sử dụng Redis Queue (RQ) hoặc Celery để quản lý hàng đợi với các trạng thái: `PENDING`, `INVITED`, `TESTING`, `PASSED`, `FAILED`, `SUSPENDED`.

### Bước 3: Electron Anti-Cheat App & Dynamic Test
* **Anti-Cheat (Testing Mode):**
  * **Kiosk Mode:** Khi nhập Test ID, Electron gọi API `setKiosk(true)` và `setAlwaysOnTop(true, 'screen-saver')` để khóa toàn màn hình.
  * **OS Hooking:** Tích hợp các package C/C++ (như `iohook`) qua Node.js để vô hiệu hóa phím tắt hệ điều hành (`Alt+Tab`, `Win+D`, `Ctrl+C`).
  * **Process Killer:** Chạy ngầm một script quét Task Manager (bằng lệnh `tasklist` trên Windows). Nếu phát hiện `AnyDesk`, `TeamViewer`, `ChatGPT`, tự động kill process hoặc chặn không cho thi.
* **Dynamic Test Generation:** * Backend truyền dữ liệu CV của ứng viên vào Prompt của LLM để sinh ra câu hỏi.
  * *Ví dụ:* "Ứng viên ghi có làm CI/CD pipeline với Jenkins. Hãy tạo 3 câu hỏi trắc nghiệm và 1 câu tự luận yêu cầu giải thích luồng xử lý lỗi trong pipeline đó".

### Bước 4: AI Proctoring (Tracking Mắt & Âm thanh)
* **Luồng hoạt động:** Model chạy liên tục trong lúc làm bài. Nếu liếc mắt ra ngoài màn hình quá lâu hoặc phát hiện tiếng người nói chuyện -> Tăng thanh cảnh báo. Đầy thanh cảnh báo -> Suspend.
* **Giải pháp:** * **Computer Vision:** Tích hợp `MediaPipe Face Mesh` (chạy trực tiếp bằng JavaScript trên Client để giảm tải Server) để tính toán hướng nhìn (Gaze Tracking). 
  * **Audio:** Dùng `Web Audio API` đo cường độ âm thanh (Decibel) và kết hợp `SpeechRecognition` để lọc xem đó là tiếng ồn môi trường hay tiếng người nói.

### Bước 5: Auto-Grading & Re-queue
* **Luồng hoạt động:** Sau khi nộp bài, hệ thống chấm điểm dựa trên Rubric. Nếu trượt, pop người thứ 11 từ danh sách chờ và lặp lại Bước 2.
* **Giải pháp:** Các câu hỏi trắc nghiệm chấm bằng logic thông thường. Các câu tự luận giải thích Project dùng LLM để so khớp (Semantic Search) giữa câu trả lời và CV gốc xem có độ vênh (gian lận/chém gió) hay không.

### Bước 6: HR Report
* **Luồng hoạt động:** Đẩy toàn bộ dữ liệu (Điểm số, CV, Video Log/Warning Log) về Dashboard của HR.

---

## 3. Tech Stack Đề xuất

| Phân hệ | Công nghệ khuyên dùng | Lý do |
| :--- | :--- | :--- |
| **Backend & AI** | Python (FastAPI) + Celery | FastAPI nhanh, Python code AI, LLM và xử lý file (PDF CV). |
| **Database** | PostgreSQL + Redis | Postgres lưu User/Report. Redis làm Queue tuyển dụng. |
| **Web Frontend** | React.js (Next.js) | Phổ biến, dễ chia task, nhiều thư viện UI cho Dashboard. |
| **Desktop App** | Electron + React + Node.js | Kết hợp Web UI làm bài test và Node.js để can thiệp hệ thống (quét tiến trình, khóa màn hình). |
| **Proctoring** | MediaPipe Face Mesh, SpeechRecognition | Nhẹ, chạy luôn trên trình duyệt/Electron của user, nhận diện mắt, khuôn mặt theo thời gian thực, không cần gpu, có thể code logic heuristic thông thường để detect abnomally |

---

## NB:
Tóm lại pipeline của mình sẽ bao gồm 3 phần:
- **Web:** Là nơi HR đăng tin tuyển dụng và User nộp đơn
- **Backend:** Là nơi xử lí việc tiếp cận đơn tuyển dụng, chạy các model LLM để *Ranking CV* tạo *Priority Queue* dựa trên techstack, project rồi chọn ra **N** ứng viên (do nhu cầu tuyển dụng) để tự động tạo room test trên Electron app. Đồng thời nó cũng sẽ tạo câu hỏi cho ứng viên dựa trên techstack và project trong CV mà ứng viên cung cấp.(Mình control level nó kĩ kĩ tí, chắc phải design một cái ma trận bài thi kiểu như 1-2 câu leetcode(easy - hard), 2-3 câu giải thích pipeline project đã làm, ...). Sau khi chuẩn bị xong hết thì gửi message thông qua mail(hoặc web portal) thông báo cho ứng viên xếp lịch và tải app. Backend cũng nhận kết quả bài test về từ Electron app và ra quyết định coi thằng này có bịp hay không để push ứng viên tiếp theo vô queue(tới đây thì lặp lại pipeline từ đầu).
- **Electron app:** Giống kiểu vscode thì thằng electron có nhiệm vụ bê nguyên cái web thành file exe chạy giống app trên window, nó can thiệp được tới canva priority nên control/kill các process sus(trừ mấy phím như window hay gì thì phải xài tới OS Hooking C/C++ để vô hiệu hóa tạm thời,..). App này thì sẽ chạy trực tiếp *MediaPipe Face Mesh* và *Speech Recognition* kết hợp với thuật toán heuristic cũng được(muốn deep cũng được luôn, train chắc lẹ tại nó là data dạng keypoint nhưng phải có dataset) để detect abnomally từ góc quay mặt, mắt, giọng nói người và gửi kết quả tới backend. Nó sẽ nhận bộ câu hỏi được gen ra từ Backend Server và thời gian làm bài test từ User phản hồi lại để thiết lập bài thi. Lúc chưa vô thi thì thoải mái thôi còn đã vô thi thì nó sẽ bật các config security lên.


- Có vẻ phần OS Hooking với Backend là nặng nhất nên ae mai rảnh ngồi thử nghiệm tiện thì code luôn, được tới đâu hay tới đó rồi ráng vô đó lắp ghép với chỉnh thôi.

