SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE users (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	username VARCHAR(100) NOT NULL, 
	password VARCHAR(255) NOT NULL, 
	`role` ENUM('admin','manager') NOT NULL, 
	is_active BOOL NOT NULL, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	UNIQUE (username)
);

CREATE TABLE upload_history (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	user_id BIGINT NOT NULL, 
	original_filename VARCHAR(255) NOT NULL, 
	stored_filename VARCHAR(255) NOT NULL, 
	total_data INTEGER, 
	status ENUM('UPLOADING','SUCCESS','FAILED'), 
	uploaded_at DATETIME, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	UNIQUE (stored_filename)
);

CREATE TABLE kategori (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	kode VARCHAR(20) NOT NULL, 
	nama VARCHAR(100) NOT NULL, 
	tipe_formulir ENUM('CAPEX','OPEX'), 
	PRIMARY KEY (id), 
	UNIQUE (kode)
);

CREATE TABLE budget (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	kategori_id BIGINT, 
	periode VARCHAR(30), 
	nominal NUMERIC(18, 2) NOT NULL, 
	created_by BIGINT, 
	upload_id BIGINT, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(kategori_id) REFERENCES kategori (id), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(upload_id) REFERENCES upload_history (id)
);

CREATE TABLE planning_header (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	periode VARCHAR(30) NOT NULL, 
	user_id BIGINT NOT NULL, 
	filename VARCHAR(255) NOT NULL, 
	status ENUM('UPLOADING','SUCCESS','SUCCES','FAILED'), 
	uploaded_at DATETIME, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE planning_detail (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	planning_header_id BIGINT NOT NULL, 
	kategori_id BIGINT, 
	month VARCHAR(20) COMMENT 'Bulan planning, contoh: Jan, Feb, Mar', 
	item VARCHAR(255) NOT NULL, 
	planning_amount NUMERIC(18, 2) NOT NULL, 
	remarks VARCHAR(255), 
	status_realisasi ENUM('OPEN','PROSES','CLOSED','CANCELLED') NOT NULL COMMENT 'Agregat status realisasi dari semua PR yang di-mapping ke item ini', 
	created_at TIMESTAMP NULL, 
	updated_at TIMESTAMP NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(planning_header_id) REFERENCES planning_header (id), 
	FOREIGN KEY(kategori_id) REFERENCES kategori (id)
);

CREATE TABLE pr_po_data (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	upload_id BIGINT, 
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
	non_stock_item BOOL, 
	kategori_id BIGINT, 
	budget_id BIGINT, 
	planning_detail_id BIGINT, 
	status_ai ENUM('WAITING','PROCESSING','DONE','FAILED','NEED_MAPPING','CANCELLED'), 
	procurement_status ENUM('PR_CREATED','PO_ISSUED','PARTIAL_RECEIVED','GOODS_RECEIVED','COMPLETED'), 
	budget_status ENUM('ON_PLAN','OVER_PLAN','UNDER_PLAN','OOP'), 
	layer_klasifikasi SMALLINT COMMENT '1=Rule Base, 2=Regex, 3=SVM', 
	metode_klasifikasi ENUM('RULE_BASE','REGEX','SVM','MANUAL'), 
	perlu_review BOOL, 
	kategori_id_koreksi BIGINT, 
	direview_oleh BIGINT, 
	direview_at DATETIME, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	dibatalkan_oleh BIGINT, 
	dibatalkan_at DATETIME, 
	alasan_pembatalan TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(upload_id) REFERENCES upload_history (id), 
	FOREIGN KEY(kategori_id) REFERENCES kategori (id), 
	FOREIGN KEY(budget_id) REFERENCES budget (id), 
	FOREIGN KEY(planning_detail_id) REFERENCES planning_detail (id), 
	FOREIGN KEY(kategori_id_koreksi) REFERENCES kategori (id), 
	FOREIGN KEY(direview_oleh) REFERENCES users (id), 
	FOREIGN KEY(dibatalkan_oleh) REFERENCES users (id)
);

CREATE TABLE klasifikasi_log (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	pr_po_data_id BIGINT, 
	layer SMALLINT COMMENT '1=Rule Base, 2=Regex, 3=SVM', 
	method ENUM('RULE_BASE','REGEX','SVM'), 
	berhasil BOOL, 
	kategori_hasil_id BIGINT, 
	confidence_score NUMERIC(5, 4), 
	processing_time NUMERIC(10, 4) COMMENT 'Waktu proses dalam detik', 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(pr_po_data_id) REFERENCES pr_po_data (id), 
	FOREIGN KEY(kategori_hasil_id) REFERENCES kategori (id)
);

CREATE TABLE mapping_log (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	pr_po_data_id BIGINT NOT NULL, 
	method ENUM('ITEM_MAPPING_RULE','FUZZY_MATCH','MANUAL') NOT NULL, 
	planning_detail_hasil_id BIGINT, 
	confidence_score NUMERIC(5, 4), 
	rank_no INTEGER, 
	is_selected BOOL, 
	processing_time NUMERIC(10, 4), 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(pr_po_data_id) REFERENCES pr_po_data (id) ON DELETE CASCADE, 
	FOREIGN KEY(planning_detail_hasil_id) REFERENCES planning_detail (id) ON DELETE SET NULL
);

CREATE TABLE item_mapping (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	kategori_id BIGINT, 
	keyword VARCHAR(255) NOT NULL, 
	planning_item VARCHAR(255) NOT NULL, 
	priority INTEGER, 
	is_active BOOL, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(kategori_id) REFERENCES kategori (id)
);

CREATE TABLE system_setting (
	id BIGINT NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(100) NOT NULL UNIQUE,
	value TEXT NOT NULL,
	description VARCHAR(255),
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id)
);

SET FOREIGN_KEY_CHECKS=1;
