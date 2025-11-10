// Firebase Configuration - UPDATED FOR REAL DATA STRUCTURE
const firebaseConfig = {
    apiKey: "AIzaSyBfcjTc-bfiRocYeBSmUrxid6WEVBYvVTg",
    authDomain: "pgfxtool-pro.firebaseapp.com",
    databaseURL: "https://pgfxtool-pro-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pgfxtool-pro",
    storageBucket: "pgfxtool-pro.appspot.com",
    messagingSenderId: "1096122383871",
    appId: "1:1096122383871:android:82a42721ccff8294d33bca"
};

// Firebase Initialization - FIXED
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase initialized successfully');
        } else {
            console.log('⚠️ Firebase already initialized');
        }
        
        // Initialize services after Firebase is ready
        auth = firebase.auth();
        database = firebase.database();
        storage = firebase.storage();
        console.log('✅ Firebase services initialized');
    } else {
        console.error('❌ Firebase SDK not loaded');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Authentication Functions - UPDATED FOR REAL STRUCTURE
class FirebaseAuth {
    static async register(email, password, username) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Save user data to database - matching REAL structure from your data
            await database.ref('users/' + user.uid).set({
                displayName: username,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                profile: {
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=4ECDC4&color=fff&size=150`,
                    bio: ""
                }
            });
            
            return user;
        } catch (error) {
            throw error;
        }
    }

    static async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update last login
            await database.ref('users/' + user.uid).update({
                lastLogin: Date.now()
            });
            
            return user;
        } catch (error) {
            throw error;
        }
    }

    static async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            throw error;
        }
    }

    static getCurrentUser() {
        return auth ? auth.currentUser : null;
    }

    static onAuthStateChanged(callback) {
        return auth ? auth.onAuthStateChanged(callback) : null;
    }
}

// Database Functions - COMPLETELY REWRITTEN FOR REAL DATA STRUCTURE
class FirebaseDatabase {
    
    // User Functions - UPDATED FOR REAL STRUCTURE
    static async getUserData(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('users/' + uid).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                // Handle different user data structures
                return {
                    uid: uid,
                    username: userData.displayName || userData.username || 'مستخدم',
                    email: userData.email,
                    userAvatar: userData.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'مستخدم')}&size=150`,
                    createdAt: userData.createdAt,
                    lastLogin: userData.lastLogin
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    // Manga Functions - UPDATED FOR REAL STRUCTURE (manga_list)
    static async getMangaList() {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('manga_list').once('value');
            const mangaList = [];
            
            snapshot.forEach(childSnapshot => {
                const mangaData = childSnapshot.val();
                if (mangaData && mangaData.name) {
                    mangaList.push({
                        id: childSnapshot.key,
                        name: mangaData.name,
                        description: mangaData.description || 'لا يوجد وصف',
                        thumbnail: mangaData.thumbnail || '',
                        rating: mangaData.rating || 0,
                        views: mangaData.views || 0,
                        updatedAt: mangaData.updatedAt || Date.now(),
                        chapters: mangaData.chapters || {},
                        id_manga: mangaData.id_manga || childSnapshot.key
                    });
                }
            });
            
            console.log(`📚 Loaded ${mangaList.length} manga from database`);
            return mangaList;
        } catch (error) {
            console.error('Error getting manga list:', error);
            throw error;
        }
    }

    static async getMangaById(mangaId) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('manga_list/' + mangaId).once('value');
            const mangaData = snapshot.val();
            
            if (mangaData) {
                return {
                    id: mangaId,
                    ...mangaData
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting manga:', error);
            throw error;
        }
    }

    // Chapters Functions - UPDATED FOR REAL STRUCTURE
    static async getChapters(mangaId) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('manga_list/' + mangaId + '/chapters').once('value');
            const chapters = [];
            
            snapshot.forEach(childSnapshot => {
                const chapterData = childSnapshot.val();
                if (chapterData && chapterData.chapter_name) {
                    chapters.push({
                        id: childSnapshot.key,
                        chapter_name: chapterData.chapter_name,
                        chapter_title: chapterData.chapter_title || chapterData.chapter_name,
                        chapter_description: chapterData.chapter_description || '',
                        images: chapterData.images || [],
                        date_up: chapterData.date_up || new Date().toISOString(),
                        comments: chapterData.comments || {}
                    });
                }
            });
            
            // Sort chapters by date
            return chapters.sort((a, b) => new Date(b.date_up) - new Date(a.date_up));
        } catch (error) {
            console.error('Error getting chapters:', error);
            return [];
        }
    }

    static async getChapter(mangaId, chapterId) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('manga_list/' + mangaId + '/chapters/' + chapterId).once('value');
            const chapterData = snapshot.val();
            
            if (chapterData) {
                return {
                    id: chapterId,
                    ...chapterData,
                    images: chapterData.images || []
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting chapter:', error);
            throw error;
        }
    }

    // Comments Functions - COMPLETELY REWRITTEN FOR REAL STRUCTURE
    static async getComments(mangaId, chapterId = null) {
        try {
            if (!database) throw new Error('Database not initialized');
            
            // Based on your data structure, comments are stored under comments/manga_id
            const snapshot = await database.ref('comments/' + mangaId).once('value');
            const comments = [];
            
            snapshot.forEach(childSnapshot => {
                const commentData = childSnapshot.val();
                
                // Skip null entries and handle different comment structures
                if (commentData && typeof commentData === 'object') {
                    // Handle both old and new comment structures
                    const comment = {
                        id: childSnapshot.key,
                        userId: commentData.userId || commentData.user,
                        userName: commentData.userName || commentData.user || commentData.displayName || 'مستخدم',
                        userAvatar: commentData.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(commentData.userName || commentData.user || 'مستخدم')}&size=150`,
                        text: commentData.text || '',
                        timestamp: commentData.timestamp || Date.now(),
                        replies: commentData.replies || {},
                        edited: commentData.edited || false,
                        editTimestamp: commentData.editTimestamp,
                        likes: commentData.likes || 0
                    };
                    
                    // Only add if it has text content
                    if (comment.text) {
                        comments.push(comment);
                    }
                }
            });
            
            return comments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch (error) {
            console.error('Error getting comments:', error);
            return [];
        }
    }

    static async addComment(mangaId, chapterId, uid, userName, userAvatar, text) {
        try {
            if (!database) throw new Error('Database not initialized');
            
            const commentRef = database.ref('comments/' + mangaId).push();
            const commentData = {
                userId: uid,
                userName: userName,
                userAvatar: userAvatar,
                text: text,
                timestamp: Date.now(),
                replies: {}
            };
            
            await commentRef.set(commentData);
            
            // Also add to chapter comments if chapterId is provided
            if (chapterId) {
                const chapterCommentRef = database.ref(`manga_list/${mangaId}/chapters/${chapterId}/comments`).push();
                await chapterCommentRef.set({
                    userId: uid,
                    user: userName,
                    text: text,
                    timestamp: Date.now(),
                    likes: 0
                });
            }
            
            return commentRef.key;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    static async replyToComment(mangaId, commentId, uid, userName, userAvatar, replyingTo, text) {
        try {
            if (!database) throw new Error('Database not initialized');
            
            const replyRef = database.ref(`comments/${mangaId}/${commentId}/replies`).push();
            const replyData = {
                userId: uid,
                userName: userName,
                userAvatar: userAvatar,
                replyingTo: replyingTo,
                text: text,
                timestamp: Date.now()
            };
            
            await replyRef.set(replyData);
            return replyRef.key;
        } catch (error) {
            console.error('Error adding reply:', error);
            throw error;
        }
    }

    static async deleteComment(mangaId, commentId) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref(`comments/${mangaId}/${commentId}`).remove();
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    // Favorites Functions - UPDATED FOR REAL STRUCTURE
    static async addToFavorites(uid, mangaId) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref('users/' + uid + '/favorites/' + mangaId).set(true);
        } catch (error) {
            console.error('Error adding to favorites:', error);
            throw error;
        }
    }

    static async removeFromFavorites(uid, mangaId) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref('users/' + uid + '/favorites/' + mangaId).remove();
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    }

    static async getFavorites(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('users/' + uid + '/favorites').once('value');
            const favorites = snapshot.val();
            return favorites ? Object.keys(favorites) : [];
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    }

    static async isFavorite(uid, mangaId) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('users/' + uid + '/favorites/' + mangaId).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking favorite:', error);
            return false;
        }
    }

    // History Functions
    static async markChapterAsRead(uid, mangaId, chapterId) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref('history/' + uid + '/' + mangaId).set({
                lastChapterId: chapterId,
                lastViewed: Date.now()
            });
        } catch (error) {
            console.error('Error marking chapter as read:', error);
            throw error;
        }
    }

    static async getReadChapters(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('history/' + uid).once('value');
            const history = snapshot.val() || {};
            return Object.keys(history);
        } catch (error) {
            console.error('Error getting read chapters:', error);
            return [];
        }
    }

    // Notifications Functions - UPDATED FOR REAL STRUCTURE
    static async getNotifications(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('notifications/' + uid).once('value');
            const notifications = [];
            
            snapshot.forEach(childSnapshot => {
                const notification = childSnapshot.val();
                if (notification) {
                    notifications.push({
                        id: childSnapshot.key,
                        ...notification
                    });
                }
            });
            
            return notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    static async deleteNotification(uid, notificationId) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref('notifications/' + uid + '/' + notificationId).remove();
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    static async clearAllNotifications(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            await database.ref('notifications/' + uid).remove();
        } catch (error) {
            console.error('Error clearing notifications:', error);
            throw error;
        }
    }

    static async markAllNotificationsAsRead(uid) {
        try {
            if (!database) throw new Error('Database not initialized');
            const snapshot = await database.ref('notifications/' + uid).once('value');
            const updates = {};
            
            snapshot.forEach(childSnapshot => {
                updates[childSnapshot.key + '/read'] = true;
            });
            
            await database.ref('notifications/' + uid).update(updates);
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        }
    }
}

// Storage Functions
class FirebaseStorage {
    static async uploadImage(file, path) {
        try {
            if (!storage) throw new Error('Storage not initialized');
            const storageRef = storage.ref(path);
            const snapshot = await storageRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            return url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    static async deleteImage(path) {
        try {
            if (!storage) throw new Error('Storage not initialized');
            await storage.ref(path).delete();
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }
}

// Debug functions - UPDATED
class FirebaseDebug {
    static async checkDataStructure() {
        try {
            console.log('🔍 Checking Firebase data structure...');
            
            if (!database) {
                return { error: 'Database not initialized' };
            }
            
            // Check manga_list
            const mangaSnapshot = await database.ref('manga_list').once('value');
            const mangaData = mangaSnapshot.val();
            const mangaCount = mangaData ? Object.keys(mangaData).length : 0;
            
            // Check users
            const usersSnapshot = await database.ref('users').once('value');
            const usersData = usersSnapshot.val();
            const usersCount = usersData ? Object.keys(usersData).length : 0;
            
            // Check comments
            const commentsSnapshot = await database.ref('comments').once('value');
            const commentsData = commentsSnapshot.val();
            const commentsCount = commentsData ? Object.keys(commentsData).length : 0;
            
            console.log(`📊 Data Summary: ${mangaCount} manga, ${usersCount} users, ${commentsCount} comment threads`);
            
            return {
                manga: mangaCount,
                users: usersCount,
                comments: commentsCount,
                status: 'success'
            };
        } catch (error) {
            console.error('Error checking data structure:', error);
            return { error: error.message };
        }
    }
}

// Global variables
let auth, database, storage;

// Initialize on load
window.addEventListener('load', async () => {
    console.log('🚀 Firebase Config Loaded');
    
    // Test availability
    console.log('📦 FirebaseAuth available:', typeof FirebaseAuth !== 'undefined');
    console.log('📦 FirebaseDatabase available:', typeof FirebaseDatabase !== 'undefined');
    console.log('📦 FirebaseStorage available:', typeof FirebaseStorage !== 'undefined');
    
    // Check data structure
    setTimeout(async () => {
        const structure = await FirebaseDebug.checkDataStructure();
        console.log('📊 Firebase Data Summary:', structure);
    }, 1000);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseAuth, FirebaseDatabase, FirebaseStorage, FirebaseDebug };
}