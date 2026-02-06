# 🤖 BOT VẬN HÀNH - Chuyên Gia Hỗ Trợ Nội Bộ

**Bot Vận Hành** là giải pháp trợ lý ảo thông minh được thiết kế riêng để hỗ trợ đội ngũ nhân viên tại các bưu cục. Dự án kết hợp sức mạnh của mô hình AI Gemini với kho kiến thức nội bộ để cung cấp các hướng dẫn quy trình chính xác, nhanh chóng và thân thiện.

## 🌟 Tính Năng Chính

- **Hỗ Trợ Quy Trình 24/7**: Giải đáp mọi thắc mắc về quy trình vận hành, xử lý hàng hóa, chính sách bưu cục.
- **Đa Nền Tảng**: Hoạt động mượt mà trên cả Web App và Telegram Bot.
- **Kho Kiến Thức Tùy Biến**: Dễ dàng cập nhật dữ liệu thông qua Google Sheets hoặc giao diện quản lý.
- **Phản Hồi "Như Người Thật"**: AI được huấn luyện để trả lời với phong cách chuyên nghiệp, đồng cảm và dễ hiểu.
- **Tìm Kiếm Thông Minh**: Sử dụng công nghệ Vector Embedding để tìm kiếm ngữ cảnh chính xác nhất.

## 🚀 Bắt Đầu

### Yêu Cầu Hệ Thống
- Node.js 18+
- Tài khoản Google Cloud (cho Gemini API & Google Sheets)

### Cài Đặt

1. Clone dự án:
   ```bash
   git clone <repository-url>
   cd Botvanhanh
   ```

2. Cài đặt dependency:
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường (`.env`):
   ```env
   VITE_GEMINI_API_KEYS=key1,key2
   TELEGRAM_BOT_TOKEN=your_bot_token
   GOOGLE_CREDS={"type": "service_account", ...}
   ```

### Chạy Dự Án

- **Web App (Next.js)**:
  ```bash
  npm run dev
  ```
- **Telegram Bot**:
  ```bash
  npm run telegram
  ```

## 🛠 Công Nghệ Sử Dụng

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion.
- **AI Core**: Google Gemini AI (Pro & Flash models).
- **Database**: Google Sheets (cho kho kiến thức), local/memory storage cho embedding.
- **Bot Framework**: Node-telegram-bot-api.

---
*Bot Vận Hành - Đồng hành cùng bạn trong mọi quy trình!*
