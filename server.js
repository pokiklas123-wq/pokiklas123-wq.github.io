const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ================= قراءة المتغيرات =================
const textKey = process.env.TEXT_KEY || "";
const password = process.env.PASS || "";

app.use(express.json());

// ================= نقطة نهاية لجلب البيانات =================
app.get('/api/keys', (req, res) => {
    res.json({
        text: textKey,
        pass: password
    });
});

// ================= نقطة نهاية للتحقق من صحة السيرفر =================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// ================= تشغيل السيرفر =================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📦 TEXT_KEY: ${textKey.substring(0, 30)}...`);
    console.log(`🔑 PASS: ${password.substring(0, 10)}...`);
});
