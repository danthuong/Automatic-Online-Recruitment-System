Dưới đây là file Markdown hoàn chỉnh, được cấu trúc rõ ràng từng giai đoạn (stage) dựa trên yêu cầu của bạn.

---

# 🛡️ Electron Client Anti-Cheat Implementation Plan
## Auto Recruit System – Coding Interview Protection

---

## 🎯 MỤC TIÊU
Xây dựng một Electron-based secure client có khả năng:
- Hạn chế gian lận ở mức OS + App.
- Ghi nhận hành vi đáng ngờ.
- Cung cấp dữ liệu cho backend AI phân tích.

> ❗ **Lưu ý:** 
> - Không hướng tới việc chống cheat 100% (điều này là không khả thi).
> - **Focus:** Detect (Phát hiện) + Log (Ghi lại) + Explain (Giải thích hành vi).

---

# 🧱 STAGE 1: BASIC LOCKDOWN (Kiosk Mode)
**🎯 Mục tiêu:** Ngăn user thoát khỏi app hoặc chuyển cửa sổ trong lúc làm bài.

### ✅ Tasks:
1.  **Enable Kiosk Mode:**
    - Chế độ Fullscreen bắt buộc.
    - Disable các nút minimize/maximize/close.
    ```javascript
    win.setKiosk(true);
    win.setFullScreen(true);
    ```
2.  **Disable System Shortcuts (OS-level):**
    - Chặn các tổ hợp phím: `Alt + Tab`, `Alt + F4`, `Ctrl + Esc`, `Windows key`.
    - **Implement:** Sử dụng C++ native hook hoặc thư viện hỗ trợ global keyboard hook (ví dụ: `iohook` hoặc `node-global-key-listener`).
3.  **Prevent App Close:**
    - Intercept sự kiện `close`.
    - Hiển thị cảnh báo hoặc chặn hành động thoát nếu chưa nộp bài.

**📦 Output:** App luôn ở trạng thái fullscreen, người dùng không thể chuyển app theo cách thông thường.

---

# 🖥️ STAGE 2: PROCESS MONITORING
**🎯 Mục tiêu:** Phát hiện các phần mềm hỗ trợ gian lận đang chạy ngầm.

### ✅ Tasks:
1.  **Scan Process định kỳ:** Kiểm tra danh sách tiến trình mỗi 1–2 giây.
    - Windows: Sử dụng lệnh `tasklist`.
    - Linux/Mac: Sử dụng lệnh `ps`.
2.  **Blacklist Apps:**
    - Remote Desktop: `TeamViewer`, `AnyDesk`.
    - Recording/Streaming: `OBS`, `Discord`.
    - Browsers ngoài hệ thống: `Chrome`, `Firefox` (nếu chạy riêng lẻ).
3.  **Xử lý khi phát hiện:** Gửi log về backend ngay lập tức.
    ```json
    {
      "event": "forbidden_process_detected",
      "process": "TeamViewer.exe",
      "timestamp": 1625091234
    }
    ```
    *(Tùy chọn: Không nhất thiết phải kill process, nhưng bắt buộc phải log để AI đánh giá).*

**📦 Output:** Danh sách các tiến trình nghi vấn được gửi về backend.

---

# 🧠 STAGE 3: WINDOW & TAB MONITORING
**🎯 Mục tiêu:** Phát hiện hành vi user rời khỏi vùng tập trung của bài thi.

### ✅ Tasks:
1.  **Detect Window Blur/Focus:**
    ```javascript
    win.on('blur', () => log("window_lost_focus"));
    win.on('focus', () => log("window_gained_focus"));
    ```
2.  **Count số lần chuyển tab/mất focus:** Theo dõi tổng số lần và thời gian user không ở trong ứng dụng.

🚨 Reality (Cực kỳ quan trọng):

Dù bạn có cài đặt Kiosk Mode hay Keyboard Hooks chặt chẽ đến đâu, hệ thống vẫn có thể bị bypass bằng:
* Task Manager: User ép đóng app hoặc kill process hook.
* Alt+Tab bypass: Các thủ thuật phần cứng hoặc phần mềm đặc biệt.
* Remote Desktop: Điều khiển từ máy tính khác.
* Crash App: Cố tình làm app lỗi để thoát ra ngoài.
* Multi-monitor: Sử dụng màn hình phụ không bị app bao phủ.

👉 Triết lý thực hiện:

❌ Không bao giờ giả định: "User không thể rời khỏi app (blur)".

✅ Luôn luôn giả định: "User có thể bypass mọi rào cản".

**Hành động**: Tập trung vào việc Log chính xác mọi khoảnh khắc blur để AI/HR đối soát.

**📦 Output:** Một bản timeline chi tiết về thời điểm user focus và blur khỏi ứng dụng.

---

# ⌨️ STAGE 4: USER INPUT TRACKING
**🎯 Mục tiêu:** Phát hiện hành vi bất thường như copy-paste code từ nguồn ngoài.

### ✅ Tasks:
1.  **Keystroke Logging:**
    - Theo dõi: `keydown timestamp`, `typing speed` (WPM), `idle time`.
2.  **Clipboard Detection:**
    ```javascript
    document.addEventListener('paste', (e) => {
      const text = e.clipboardData.getData('text');
      logPaste(text.length);
    });
    ```
3.  **Flag các hành vi:**
    - Paste đoạn văn bản cực dài (> X ký tự) trong thời gian ngắn.
    - Tần suất paste quá nhiều lần.

**📦 Output:** Log chi tiết về hành vi gõ phím và sử dụng clipboard.

---

# 🧩 STAGE 5: DEVTOOLS & DEBUG DETECTION
**🎯 Mục tiêu:** Ngăn người dùng can thiệp vào logic của App qua DevTools.

### ✅ Tasks:
1.  **Vô hiệu hóa phím tắt DevTools:** `F12`, `Ctrl+Shift+I`.
2.  **Check kích thước cửa sổ:**
    ```javascript
    setInterval(() => {
      if (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200) {
        log("devtools_possibly_open");
      }
    }, 1000);
    ```

**📦 Output:** Phát hiện và ghi lại sự kiện khi DevTools được mở.

---

# 🖥️ STAGE 6: MULTI-MONITOR DETECTION (OPTIONAL)
**🎯 Mục tiêu:** Phát hiện việc sử dụng màn hình thứ hai để tra cứu.

### ✅ Tasks:
1.  Sử dụng Electron `screen` API để đếm số lượng màn hình đang kết nối.
2.  **Flag** nếu số lượng màn hình > 1.

**📦 Output:** Ghi nhận cấu hình phần cứng (số lượng monitor).

---

# 🔌 STAGE 7: IPC & EVENT PIPELINE
**🎯 Mục tiêu:** Xây dựng đường truyền dữ liệu an toàn từ Client lên Server.

### ✅ Tasks:
1.  **Define Event Schema:**
    ```json
    {
      "type": "paste",
      "data": { "length": 1250 },
      "timestamp": "2023-10-27T10:00:00Z"
    }
    ```
2.  **IPC Flow:**
    - **Renderer process:** Thu thập dữ liệu UI (paste, gõ phím).
    - **Main process:** Thu thập dữ liệu hệ thống (process, monitor) + Gom dữ liệu.
    - **Backend:** Gửi dữ liệu theo đợt (batch) mỗi 5-10 giây để tối ưu hiệu năng.

**📦 Output:** Stream dữ liệu sự kiện liên tục và ổn định.

---

# 🧠 STAGE 8: DATA FOR AI (CRITICAL)
**🎯 Mục tiêu:** Cung cấp "nguyên liệu" sạch cho AI chấm điểm gian lận.

### ✅ Các chỉ số gửi đi:
- `keystroke_dynamics`: Tốc độ gõ, nhịp điệu gõ.
- `paste_events`: Độ dài, số lần.
- `focus_stats`: Tổng thời gian rời app.
- `process_list`: Các app chạy cùng lúc.
- `idle_time`: Thời gian không tương tác.

**📦 Output:** Dataset hoàn chỉnh phục vụ AI scoring.

---

# 🧪 STAGE 9: ANTI-TAMPER (BONUS)
**🎯 Mục tiêu:** Ngăn chặn việc cố tình can thiệp vào file của app.

### ✅ Tasks:
1.  **File Integrity Check:** Kiểm tra checksum các file quan trọng khi khởi động.
2.  **Process Shield:** Phát hiện nếu app bị kill đột ngột và gửi tín hiệu cuối cùng về server (Last Will).

**📦 Output:** Đảm bảo môi trường thực thi tin cậy.

---

# 📊 STAGE 10: TIMELINE VISUALIZATION
**🎯 Mục tiêu:** Trực quan hóa hành vi để HR/Interviewer dễ dàng đánh giá.

### ✅ Example Timeline:
- `00:00`: Bắt đầu bài thi.
- `00:30`: Typing (Tốc độ bình thường).
- `01:10`: Idle (Không hoạt động 40s).
- `01:20`: **Paste** (1200 ký tự - Nghi vấn).
- `01:25`: **Blur** (Rời app).
- `01:40`: **Focus** (Quay lại app).

**📦 Output:** Biểu đồ Timeline cho Dashboard của HR.

---

# 🏗️ PHÂN BỔ TRONG PROJECT

```text
📁 electron-client/src/
├── 📁 main/
│   ├── keyboard-hook.js    # Chặn phím tắt OS
│   ├── process-monitor.js  # Quét ứng dụng chạy ngầm
│   └── window-control.js   # Kiosk mode & Window events
├── 📁 renderer/
│   ├── input-tracker.js    # Paste & Keystroke detection
│   └── ui/                 # Giao diện bài thi
└── 📁 shared/
    ├── constants.js        # Blacklist apps, Event types
    └── ipc-schema.js       # Định nghĩa cấu trúc dữ liệu
```

---

# ⚠️ NGUYÊN TẮC QUAN TRỌNG

1.  ❌ **Không cố chặn tất cả:** Càng chặn chặt, user càng tìm cách lách. Hãy tập trung vào việc **Ghi lại**.
2.  ❌ **Không Spyware:** Chỉ thu thập dữ liệu liên quan đến bài thi, không thu thập dữ liệu cá nhân ngoài phạm vi.
3.  ❌ **Không cam kết "Chống cheat tuyệt đối":** Luôn xác định đây là hệ thống hỗ trợ ra quyết định.
4.  ✅ **Giải thích được:** Khi đánh dấu một user gian lận, phải có bằng chứng từ Timeline (Ví dụ: "User đã paste 2000 dòng code chỉ trong 1 giây").

---
**🏆 FINAL GOAL:** Xây dựng một hệ thống không chỉ chặn gian lận, mà còn thông minh trong việc phát hiện và giải thích các hành vi nghi ngờ.