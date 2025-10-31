// إدارة قاعدة البيانات
class DatabaseManager {
    constructor() {
        this.database = firebase.database();
    }
    
    // جلب قائمة المانجا
    async getMangaList() {
        try {
            const snapshot = await this.database.ref('manga_list').once('value');
            const data = snapshot.val();
            const mangaList = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    const manga = data[key];
                    manga.id = key;
                    mangaList.push(manga);
                });
            }
            
            return { success: true, data: mangaList };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // جلب مانجا محددة
    async getManga(mangaId) {
        try {
            const snapshot = await this.database.ref('manga_list/' + mangaId).once('value');
            const manga = snapshot.val();
            
            if (manga) {
                manga.id = mangaId;
            }
            
            return { success: true, data: manga };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // زيادة عدد المشاهدات
    async incrementViews(mangaId) {
        try {
            const mangaRef = this.database.ref('manga_list/' + mangaId);
            const snapshot = await mangaRef.once('value');
            const manga = snapshot.val();
            
            if (manga) {
                const currentViews = manga.views || 0;
                await mangaRef.update({
                    views: currentViews + 1
                });
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// تهيئة مدير قاعدة البيانات
let dbManager;

document.addEventListener('DOMContentLoaded', () => {
    dbManager = new DatabaseManager();
});