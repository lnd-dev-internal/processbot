import { google } from 'googleapis';

// CẤU HÌNH
const SHEET_ID = '18DrFZsubUWHdaiVR3cGSOs6E5OkICb7Zmwde0fTucW8'; // ID Sheet của bạn
const RANGE = 'Answer!A2:E';

export default async function handler(req, res) {
    // Cấu hình CORS để cho phép Frontend gọi vào
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Lấy thông tin xác thực từ Biến môi trường (An toàn hơn file)
        // Trên Vercel, bạn sẽ copy nội dung file service-account.json vào biến GOOGLE_CREDS
        let auth;
        if (process.env.GOOGLE_CREDS) {
            const credentials = JSON.parse(process.env.GOOGLE_CREDS);
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
        } else {
            // Fallback: Chạy dưới Local thì vẫn đọc file nếu muốn (nhưng khuyens khích dùng server.js ở local)
            throw new Error("Chưa cấu hình biến môi trường GOOGLE_CREDS trên Vercel");
        }

        const sheets = google.sheets({ version: 'v4', auth });

        if (req.method === 'GET') {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: RANGE,
            });

            const rows = response.data.values || [];
            const data = rows.map((row, index) => ({
                q: row[0] || '',
                topic: row[1] || '',
                a: row[2] || '',
                embedding: row[3] ? JSON.parse(row[3]) : null,
                id: 'gsheet-' + index
            }));

            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const knowledge = req.body;
            const values = knowledge.map(item => [
                item.q,
                item.topic,
                item.a,
                item.embedding ? JSON.stringify(item.embedding) : ''
            ]);

            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: RANGE,
                valueInputOption: 'RAW',
                requestBody: { values },
            });

            return res.status(200).json({ message: 'Đã đồng bộ thành công!' });
        }

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
