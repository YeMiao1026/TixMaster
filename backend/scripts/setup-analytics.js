/**
 * Analytics Events Table Setup
 *
 * 創建用於儲存分析事件的數據庫表格
 */

const db = require('../config/database');

async function setupAnalyticsTable() {
    try {
        console.log('📊 Setting up analytics_events table...');

        // 創建 analytics_events 表格
        await db.query(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                event_data JSONB NOT NULL,
                feature_flags JSONB,
                session_id VARCHAR(100),
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Table created: analytics_events');

        // 創建索引以提升查詢效能
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_event_type
            ON analytics_events(event_type);
        `);
        console.log('✅ Index created: idx_analytics_event_type');

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_session_id
            ON analytics_events(session_id);
        `);
        console.log('✅ Index created: idx_analytics_session_id');

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_created_at
            ON analytics_events(created_at);
        `);
        console.log('✅ Index created: idx_analytics_created_at');

        // 顯示表格結構
        const result = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'analytics_events'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Table structure:');
        console.table(result.rows);

        console.log('\n🎉 Analytics events table setup completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupAnalyticsTable();
