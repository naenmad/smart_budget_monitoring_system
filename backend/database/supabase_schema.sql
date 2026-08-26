-- ==============================================================================
-- SMART BUDGET MONITORING & QC SYSTEM (PT SUMMIT ADYAWINSA INDONESIA)
-- DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- ==============================================================================

-- 1. CREATE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLE: kategori
CREATE TABLE IF NOT EXISTS kategori (
    id BIGSERIAL PRIMARY KEY,
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    tipe_formulir VARCHAR(10) NOT NULL CHECK (tipe_formulir IN ('CAPEX', 'OPEX')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLE: upload_history
CREATE TABLE IF NOT EXISTS upload_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT DEFAULT 0,
    success_rows INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'SUCCESS', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLE: budget
CREATE TABLE IF NOT EXISTS budget (
    id BIGSERIAL PRIMARY KEY,
    kategori_id BIGINT REFERENCES kategori(id) ON DELETE CASCADE,
    periode VARCHAR(30) NOT NULL,
    nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    upload_id BIGINT REFERENCES upload_history(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLE: planning_header
CREATE TABLE IF NOT EXISTS planning_header (
    id BIGSERIAL PRIMARY KEY,
    periode VARCHAR(30) NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING', 'SUCCESS', 'SUCCES', 'FAILED')),
    uploaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLE: planning_detail
CREATE TABLE IF NOT EXISTS planning_detail (
    id BIGSERIAL PRIMARY KEY,
    planning_header_id BIGINT REFERENCES planning_header(id) ON DELETE CASCADE,
    kategori_id BIGINT REFERENCES kategori(id) ON DELETE SET NULL,
    month VARCHAR(20),
    item VARCHAR(255) NOT NULL,
    planning_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    remarks VARCHAR(255),
    status_realisasi VARCHAR(20) DEFAULT 'OPEN' CHECK (status_realisasi IN ('OPEN', 'PROSES', 'CLOSED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLE: pr_po_data
CREATE TABLE IF NOT EXISTS pr_po_data (
    id BIGSERIAL PRIMARY KEY,
    upload_id BIGINT REFERENCES upload_history(id) ON DELETE CASCADE,
    requisition_id VARCHAR(100),
    pr_doc_num VARCHAR(100),
    po_doc_num VARCHAR(100),
    request_date DATE,
    order_date DATE,
    description TEXT,
    comment_text TEXT,
    supplier_name VARCHAR(255),
    qty NUMERIC(15, 2),
    uom VARCHAR(20),
    unit_price NUMERIC(18, 2),
    total_price NUMERIC(18, 2),
    gr_legal_number VARCHAR(100),
    packing_slip VARCHAR(100),
    receipt_date DATE,
    invoice VARCHAR(100),
    invoice_date DATE,
    pr_status VARCHAR(100),
    po_status VARCHAR(100),
    non_stock_item BOOLEAN DEFAULT FALSE,
    kategori_id BIGINT REFERENCES kategori(id) ON DELETE SET NULL,
    budget_id BIGINT REFERENCES budget(id) ON DELETE SET NULL,
    planning_detail_id BIGINT REFERENCES planning_detail(id) ON DELETE SET NULL,
    status_ai VARCHAR(30) DEFAULT 'WAITING' CHECK (status_ai IN ('WAITING', 'PROCESSING', 'DONE', 'FAILED', 'NEED_MAPPING', 'CANCELLED')),
    procurement_status VARCHAR(30) DEFAULT 'PR_CREATED' CHECK (procurement_status IN ('PR_CREATED', 'PO_ISSUED', 'PARTIAL_RECEIVED', 'GOODS_RECEIVED', 'COMPLETED')),
    budget_status VARCHAR(20) CHECK (budget_status IN ('ON_PLAN', 'OVER_PLAN', 'UNDER_PLAN', 'OOP')),
    layer_klasifikasi SMALLINT,
    metode_klasifikasi VARCHAR(20) CHECK (metode_klasifikasi IN ('RULE_BASE', 'REGEX', 'SVM', 'MANUAL')),
    perlu_review BOOLEAN DEFAULT FALSE,
    kategori_id_koreksi BIGINT REFERENCES kategori(id) ON DELETE SET NULL,
    direview_oleh BIGINT REFERENCES users(id) ON DELETE SET NULL,
    direview_at TIMESTAMPTZ,
    dibatalkan_oleh BIGINT REFERENCES users(id) ON DELETE SET NULL,
    dibatalkan_at TIMESTAMPTZ,
    alasan_pembatalan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLE: item_mapping
CREATE TABLE IF NOT EXISTS item_mapping (
    id BIGSERIAL PRIMARY KEY,
    kategori_id BIGINT REFERENCES kategori(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLE: klasifikasi_log
CREATE TABLE IF NOT EXISTS klasifikasi_log (
    id BIGSERIAL PRIMARY KEY,
    pr_po_data_id BIGINT REFERENCES pr_po_data(id) ON DELETE CASCADE,
    layer SMALLINT,
    method VARCHAR(20) CHECK (method IN ('RULE_BASE', 'REGEX', 'SVM')),
    berhasil BOOLEAN DEFAULT TRUE,
    kategori_hasil_id BIGINT REFERENCES kategori(id) ON DELETE SET NULL,
    confidence_score NUMERIC(6, 4),
    processing_time NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLE: mapping_log
CREATE TABLE IF NOT EXISTS mapping_log (
    id BIGSERIAL PRIMARY KEY,
    pr_po_data_id BIGINT REFERENCES pr_po_data(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL CHECK (method IN ('ITEM_MAPPING_RULE', 'FUZZY_MATCH', 'MANUAL')),
    planning_detail_hasil_id BIGINT REFERENCES planning_detail(id) ON DELETE SET NULL,
    confidence_score NUMERIC(6, 4),
    rank_no INT,
    is_selected BOOLEAN DEFAULT FALSE,
    processing_time NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABLE: system_setting
CREATE TABLE IF NOT EXISTS system_setting (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pr_po_doc_num ON pr_po_data(pr_doc_num);
CREATE INDEX IF NOT EXISTS idx_pr_po_status_ai ON pr_po_data(status_ai);
CREATE INDEX IF NOT EXISTS idx_pr_po_budget_status ON pr_po_data(budget_status);
CREATE INDEX IF NOT EXISTS idx_pr_po_planning_detail_id ON pr_po_data(planning_detail_id);
CREATE INDEX IF NOT EXISTS idx_planning_detail_header ON planning_detail(planning_header_id);
CREATE INDEX IF NOT EXISTS idx_planning_detail_item ON planning_detail(item);
CREATE INDEX IF NOT EXISTS idx_budget_periode ON budget(periode);
CREATE INDEX IF NOT EXISTS idx_system_setting_key ON system_setting(key);

-- 14. SEED DEFAULT DATA
-- Default Categories (E-1, E-9, I-1)
INSERT INTO kategori (kode, nama, tipe_formulir) 
VALUES 
    ('E-1', 'Direct Material / Consumable Part', 'OPEX'),
    ('E-9', 'Indirect Material & Office Supply', 'OPEX'),
    ('I-1', 'Investment / Fixed Assets', 'CAPEX')
ON CONFLICT (kode) DO NOTHING;

-- Default Users
INSERT INTO users (name, username, password, role)
VALUES
    ('Administrator QC', 'admin', 'scrypt:32768:8:1$7fR3jOqvC0tJg9QZ$c63ca0495f4c4da17ee5eb20d437021eb3b51d8bdf9b94025b42db60802c63ae245df6f157ecdb35aa6d06d4eefd45eb2aa94a11f2a33f4a3aa822bb2b45eb9d', 'admin'),
    ('Staff QC Auditor', 'qc_user', 'scrypt:32768:8:1$7fR3jOqvC0tJg9QZ$c63ca0495f4c4da17ee5eb20d437021eb3b51d8bdf9b94025b42db60802c63ae245df6f157ecdb35aa6d06d4eefd45eb2aa94a11f2a33f4a3aa822bb2b45eb9d', 'user'),
    ('Manager Finance & QC', 'manager', 'scrypt:32768:8:1$7fR3jOqvC0tJg9QZ$c63ca0495f4c4da17ee5eb20d437021eb3b51d8bdf9b94025b42db60802c63ae245df6f157ecdb35aa6d06d4eefd45eb2aa94a11f2a33f4a3aa822bb2b45eb9d', 'manager')
ON CONFLICT (username) DO NOTHING;

-- Default System Settings
INSERT INTO system_setting (key, value, description)
VALUES
    ('auto_mapping_threshold', '85', 'Ambang batas confidence score minimum (%) untuk persetujuan otomatis AI'),
    ('auto_learning', 'true', 'Otomatis simpan konfirmasi manual menjadi rule baru di item_mapping')
ON CONFLICT (key) DO NOTHING;

