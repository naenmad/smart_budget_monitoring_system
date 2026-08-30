from flask import Blueprint, request, jsonify
from utils.db import db
from models.pr_po_data import PrPoData
from models.mapping_log import MappingLog
from models.planning_detail import PlanningDetail
from models.planning_header import PlanningHeader
from models.system_setting import SystemSetting
from models.item_mapping import ItemMapping
from services.budget_monitoring_service import BudgetMonitoringService
from services.mapping.advanced_mapping_service import AdvancedMappingService
from utils.auth import role_required

mapping_bp = Blueprint("mapping", __name__)


def _recalculate_planning_status(planning_detail_id):
    """Delegasi ke BudgetMonitoringService — single source of truth."""
    BudgetMonitoringService.recalculate_planning_status(planning_detail_id)

def _save_auto_learning_rule(pr, detail):
    """Otomatis simpan rule baru ke item_mapping jika auto_learning aktif."""
    try:
        auto_learn = SystemSetting.get_value("auto_learning", "true")
        if auto_learn.lower() in ["true", "1", "yes"] and pr.description and detail and detail.item:
            clean_keyword = pr.description.strip()
            if len(clean_keyword) >= 3:
                existing = ItemMapping.query.filter(
                    ItemMapping.keyword.ilike(clean_keyword),
                    ItemMapping.planning_item == detail.item
                ).first()
                if not existing:
                    new_rule = ItemMapping(
                        keyword=clean_keyword,
                        planning_item=detail.item,
                        kategori_id=detail.kategori_id,
                        priority=2,
                        is_active=True
                    )
                    db.session.add(new_rule)
                    print(f"[Auto-Learning] Saved new rule: '{clean_keyword}' -> '{detail.item}'")
    except Exception as e:
        print(f"[Auto-Learning] Error saving rule: {e}")

@mapping_bp.route("/pending", methods=["GET"])
def get_pending_mapping():
    """Mendapatkan Antrean PR yang Membutuhkan Budget Mapping & Top 5 AI Candidates
    ---
    tags:
      - Item Mapping & Threshold
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
      - name: keyword
        in: query
        type: string
        description: Filter pencarian teks nomor PR, deskripsi, atau komentar
    responses:
      200:
        description: Daftar PR NEED_MAPPING beserta kandidat fuzzy matching Top-5
    """
    # Ambil pagination dari query string
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    keyword = request.args.get('keyword', '').strip()

    query = PrPoData.query.filter_by(status_ai="NEED_MAPPING")
    if keyword:
        query = query.filter(
            (PrPoData.pr_doc_num.ilike(f"%{keyword}%")) |
            (PrPoData.description.ilike(f"%{keyword}%")) |
            (PrPoData.comment_text.ilike(f"%{keyword}%"))
        )
    pagination = query.order_by(PrPoData.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    results = []
    for pr in pagination.items:
        # Cari kandidat fuzzy match dari mapping_log
        logs = MappingLog.query.filter_by(pr_po_data_id=pr.id, method="FUZZY_MATCH").order_by(MappingLog.rank_no.asc()).all()
        candidates = []
        for log in logs:
            detail = db.session.get(PlanningDetail, log.planning_detail_hasil_id) if log.planning_detail_hasil_id else None
            
            pr_code = AdvancedMappingService.extract_code(pr.description)
            candidate_code = AdvancedMappingService.extract_code(detail.item) if detail else None
            
            candidates.append({
                "log_id": log.id,
                "planning_detail_id": log.planning_detail_hasil_id,
                "confidence_score": float(log.confidence_score) if log.confidence_score else None,
                "rank_no": log.rank_no,
                "planning_item": detail.item if detail else None,
                "planning_amount": float(detail.planning_amount) if detail else None,
                "month": detail.month if detail else None,
                "remarks": detail.remarks if detail else None,
                "code_mismatch": pr_code is not None and candidate_code is not None and pr_code != candidate_code,
                "pr_code": pr_code,
                "candidate_code": candidate_code
            })
            
        pr_dict = pr.to_dict()
        pr_dict["fuzzy_candidates"] = candidates
        results.append(pr_dict)
        
    return jsonify({
        "success": True,
        "data": results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    }), 200

@mapping_bp.route("/<int:pr_id>/confirm", methods=["POST"])
@role_required("admin")
def confirm_mapping(pr_id):
    """Konfirmasi Manual Pilihan Item Planning atau OOP untuk Satu PR
    ---
    tags:
      - Item Mapping & Threshold
    security:
      - Bearer: []
    parameters:
      - name: pr_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            planning_detail_id:
              type: integer
              example: 174
            rank_no:
              type: integer
              example: 1
            is_oop:
              type: boolean
              example: false
    responses:
      200:
        description: Mapping berhasil dikonfirmasi dan konsumsi budget dihitung
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"success": False, "message": "Request body harus berupa JSON"}), 400

    planning_detail_id = data.get("planning_detail_id")
    rank_no = data.get("rank_no")
    is_oop = data.get("is_oop", False)

    # Validasi tipe data
    if not isinstance(is_oop, bool):
        return jsonify({"success": False, "message": "is_oop harus berupa boolean (true/false)"}), 400

    if not is_oop and planning_detail_id is not None:
        if not isinstance(planning_detail_id, int) or planning_detail_id <= 0:
            return jsonify({"success": False, "message": "planning_detail_id harus berupa bilangan bulat positif"}), 400

    pr = db.session.get(PrPoData, pr_id)
    if not pr:
        return jsonify({"success": False, "message": "PR tidak ditemukan"}), 404
        
    if is_oop:
        old_planning_detail_id = pr.planning_detail_id  # simpan sebelum dikosongkan
        pr.planning_detail_id = None
        pr.status_ai = "DONE"
        pr.budget_status = "OOP"
        pr.perlu_review = False
        
        new_log = MappingLog(
            pr_po_data_id=pr.id,
            method="MANUAL",
            planning_detail_hasil_id=None,
            confidence_score=None,
            rank_no=None,
            is_selected=True,
            processing_time=0.0
        )
        db.session.add(new_log)

        # Hitung ulang status_realisasi planning_detail yang lama (kehilangan satu PR)
        if old_planning_detail_id:
            _recalculate_planning_status(old_planning_detail_id)

        db.session.commit()
        return jsonify({
            "success": True, 
            "message": "Mapping dikonfirmasi sebagai OOP",
            "data": pr.to_dict()
        }), 200

    if not planning_detail_id:
        return jsonify({"success": False, "message": "planning_detail_id tidak boleh kosong"}), 400
        
    # Validasi planning_detail_id
    detail = db.session.get(PlanningDetail, planning_detail_id)
    if not detail:
        return jsonify({"success": False, "message": "planning_detail_id tidak valid"}), 400

    # Simpan kategori lama sebagai koreksi, update kategori aktif ikut planning_detail
    old_planning_detail_id = pr.planning_detail_id  # simpan sebelum diubah
    if pr.kategori_id != detail.kategori_id:
        pr.kategori_id_koreksi = detail.kategori_id
    pr.kategori_id = detail.kategori_id
    pr.planning_detail_id = planning_detail_id
    pr.status_ai = "DONE"
    pr.perlu_review = False
    
    # Buat log MANUAL
    new_log = MappingLog(
        pr_po_data_id=pr.id,
        method="MANUAL",
        planning_detail_hasil_id=planning_detail_id,
        confidence_score=None,
        rank_no=rank_no,
        is_selected=True,
        processing_time=0.0
    )
    db.session.add(new_log)
    
    # Optional: Tandai log fuzzy sebelumnya sebagai is_selected = True jika match
    if rank_no:
        old_log = MappingLog.query.filter_by(
            pr_po_data_id=pr.id, 
            method="FUZZY_MATCH", 
            planning_detail_hasil_id=planning_detail_id
        ).first()
        if old_log:
            old_log.is_selected = True

    # Hitung ulang status_realisasi:
    # 1) planning_detail baru (PR ini baru ditautkan)
    _recalculate_planning_status(planning_detail_id)
    # 2) planning_detail lama (jika berubah mapping, item lama kehilangan satu PR)
    if old_planning_detail_id and old_planning_detail_id != planning_detail_id:
        _recalculate_planning_status(old_planning_detail_id)

    # Simpan rule auto-learning jika diaktifkan
    _save_auto_learning_rule(pr, detail)

    db.session.commit()
    db.session.refresh(pr)  # reload relationship agar kategori_kode reflect update
    
    # Setelah confirm, harus dilanjut ke Budget Monitoring
    BudgetMonitoringService.calculate_budget_consumption(pr)
    
    return jsonify({
        "success": True, 
        "message": "Mapping berhasil dikonfirmasi dan budget dihitung",
        "data": pr.to_dict()
    }), 200
@mapping_bp.route("/planning_detail/search", methods=["GET"])
def search_planning_detail():
    """
    Search manual item Planning untuk Review Mapping — dipakai reviewer
    kalau Top-5 fuzzy tidak ada yang cocok.
    """
    keyword = request.args.get("keyword", "").strip()
    pr_id = request.args.get("pr_id", type=int)  # untuk auto-scope header/bulan

    pr = db.session.get(PrPoData, pr_id) if pr_id else None

    query = PlanningDetail.query
    
    # Default: scope ke header (tahun) yang sama dengan PR ini
    if pr:
        periode = AdvancedMappingService.extract_periode(pr.pr_doc_num)
        header = PlanningHeader.query.filter(
            PlanningHeader.periode == periode,
            PlanningHeader.status.in_(["SUCCESS", "SUCCES"])
        ).first()
        if header:
            query = query.filter_by(planning_header_id=header.id)

    if keyword:
        query = query.filter(
            (PlanningDetail.item.ilike(f"%{keyword}%")) |
            (PlanningDetail.remarks.ilike(f"%{keyword}%"))
        )

    results = query.limit(150).all()
    return jsonify({
        "success": True,
        "data": [
            {
                "id": p.id,
                "item": p.item,
                "month": p.month,
                "kategori_id": p.kategori_id,
                "kategori_kode": p.kategori.kode if p.kategori else None,
                "kategori_nama": p.kategori.nama if p.kategori else None,
                "kategori_tipe_formulir": p.kategori.tipe_formulir if p.kategori else None,
                "planning_amount": float(p.planning_amount) if p.planning_amount else 0,
                "remarks": p.remarks
            } for p in results
        ]
    }), 200

@mapping_bp.route("/<int:pr_id>/undo_mapping",methods=["POST"])
@role_required('admin')
def undo_mapping(pr_id):
    pr=db.session.get(PrPoData,pr_id)
    if not pr:
        return jsonify({"success":False,"message":"PR tidak ditemukan"}),404
    if pr.status_ai not in ("DONE",):
        return jsonify({
            "success": False,
            "message": f"Item ini statusnya '{pr.status_ai}', tidak ada konfirmasi untuk dibatalkan"
        }), 400

    old_status_summary = "OOP" if pr.budget_status == "OOP" else "Mapped"
    old_planning_detail_id = pr.planning_detail_id  # simpan sebelum dikosongkan
 
    pr.planning_detail_id = None
    pr.status_ai = "NEED_MAPPING"
    pr.budget_status = None
    pr.perlu_review = True
 
    # Catat pembatalan sebagai baris baru di log (bukan menimpa histori lama)
    new_log = MappingLog(
        pr_po_data_id=pr.id,
        method="MANUAL",
        planning_detail_hasil_id=None,
        confidence_score=None,
        rank_no=None,
        is_selected=False,  # ini pembatalan, bukan pilihan baru
        processing_time=0.0
    )
    db.session.add(new_log)
 
    # planning_detail lama (kalau ada) kehilangan satu PR — hitung ulang status_realisasi-nya
    if old_planning_detail_id:
        _recalculate_planning_status(old_planning_detail_id)
 
    db.session.commit()
 
    return jsonify({
        "success": True,
        "message": f"Konfirmasi dibatalkan (sebelumnya: {old_status_summary}), dikembalikan ke antrian review",
        "data": pr.to_dict()
    }), 200

@mapping_bp.route("/bulk_confirm", methods=["POST"])
@role_required('admin')
def bulk_confirm():
    """
    Endpoint untuk bulk action confirm mapping PR.
    Payload:
    {
      "mappings": [
         { "pr_id": 1, "planning_detail_id": 10, "rank_no": 1, "is_oop": false },
         ...
      ]
    }
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict) or "mappings" not in data:
        return jsonify({"success": False, "message": "Payload harus berupa JSON dengan key 'mappings'"}), 400

    mappings = data.get("mappings", [])
    if not isinstance(mappings, list):
        return jsonify({"success": False, "message": "'mappings' harus berupa array"}), 400

    success_count = 0
    errors = []

    for item in mappings:
        pr_id = item.get("pr_id")
        planning_detail_id = item.get("planning_detail_id")
        rank_no = item.get("rank_no")
        is_oop = item.get("is_oop", False)

        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            errors.append(f"PR ID {pr_id} tidak ditemukan.")
            continue
            
        old_planning_detail_id = pr.planning_detail_id
            
        if is_oop:
            pr.planning_detail_id = None
            pr.status_ai = "DONE"
            pr.budget_status = "OOP"
            pr.perlu_review = False
            
            new_log = MappingLog(
                pr_po_data_id=pr.id,
                method="MANUAL",
                planning_detail_hasil_id=None,
                confidence_score=None,
                rank_no=None,
                is_selected=True,
                processing_time=0.0
            )
            db.session.add(new_log)
        else:
            if not planning_detail_id:
                errors.append(f"PR ID {pr_id}: planning_detail_id kosong.")
                continue
                
            detail = db.session.get(PlanningDetail, planning_detail_id)
            if not detail:
                errors.append(f"PR ID {pr_id}: planning_detail_id {planning_detail_id} tidak valid.")
                continue

            if pr.kategori_id != detail.kategori_id:
                pr.kategori_id_koreksi = detail.kategori_id
            pr.kategori_id = detail.kategori_id
            pr.planning_detail_id = planning_detail_id
            pr.status_ai = "DONE"
            pr.perlu_review = False
            
            new_log = MappingLog(
                pr_po_data_id=pr.id,
                method="MANUAL",
                planning_detail_hasil_id=planning_detail_id,
                confidence_score=None,
                rank_no=rank_no,
                is_selected=True,
                processing_time=0.0
            )
            db.session.add(new_log)
            
            if rank_no:
                old_log = MappingLog.query.filter_by(
                    pr_po_data_id=pr.id, 
                    method="FUZZY_MATCH", 
                    planning_detail_hasil_id=planning_detail_id
                ).first()
                if old_log:
                    old_log.is_selected = True

        # Kalkulasi
        if not is_oop and planning_detail_id:
            _recalculate_planning_status(planning_detail_id)
            detail = db.session.get(PlanningDetail, planning_detail_id)
            if detail:
                _save_auto_learning_rule(pr, detail)
            
        if old_planning_detail_id and old_planning_detail_id != planning_detail_id:
            _recalculate_planning_status(old_planning_detail_id)
            
        BudgetMonitoringService.calculate_budget_consumption(pr)
        success_count += 1

    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"{success_count} PR berhasil diproses.",
        "errors": errors
    }), 200

# ------------------------------------------------------------------
# Auto-Mapping Settings
# GET & POST /api/v1/mapping/settings
# ------------------------------------------------------------------
@mapping_bp.route("/settings", methods=["GET"])
def get_mapping_settings():
    """Mengambil konfigurasi ambang batas persentase otomatisasi & auto-learning."""
    raw_thresh = SystemSetting.get_value("auto_mapping_threshold", "85")
    raw_learn = SystemSetting.get_value("auto_learning", "true")
    
    try:
        threshold = float(raw_thresh)
    except (ValueError, TypeError):
        threshold = 85.0
        
    auto_learning = raw_learn.lower() in ["true", "1", "yes"]
    
    return jsonify({
        "success": True,
        "data": {
            "auto_mapping_threshold": threshold,
            "auto_learning": auto_learning
        }
    }), 200

@mapping_bp.route("/settings", methods=["POST"])
@role_required("admin")
def update_mapping_settings():
    """Memperbarui ambang batas persentase otomatisasi & status auto-learning."""
    data = request.get_json(silent=True) or {}
    
    threshold = data.get("auto_mapping_threshold")
    auto_learning = data.get("auto_learning")
    
    if threshold is not None:
        try:
            threshold_val = float(threshold)
            if not (0 <= threshold_val <= 100):
                return jsonify({"success": False, "message": "Threshold harus antara 0% dan 100%"}), 400
            SystemSetting.set_value("auto_mapping_threshold", str(threshold_val), "Ambang batas confidence score minimum (%) untuk persetujuan otomatis AI")
        except (ValueError, TypeError):
            return jsonify({"success": False, "message": "Threshold harus berupa angka"}), 400
            
    if auto_learning is not None:
        learn_val = "true" if auto_learning else "false"
        SystemSetting.set_value("auto_learning", learn_val, "Otomatis simpan konfirmasi manual menjadi rule baru di item_mapping")
        
    return jsonify({
        "success": True,
        "message": "Pengaturan otomatisasi mapping berhasil diperbarui",
        "data": {
            "auto_mapping_threshold": float(SystemSetting.get_value("auto_mapping_threshold", "85")),
            "auto_learning": SystemSetting.get_value("auto_learning", "true").lower() in ["true", "1", "yes"]
        }
    }), 200

# ------------------------------------------------------------------
# Trigger Batch Auto-Confirm by Threshold
# POST /api/v1/mapping/auto_confirm_threshold
# ------------------------------------------------------------------
@mapping_bp.route("/auto_confirm_threshold", methods=["POST"])
@role_required("admin")
def auto_confirm_by_threshold():
    """
    Eksekusi persetujuan otomatis secara massal pada seluruh PR berstatus
    NEED_MAPPING yang skor AI kandidat Top-1 nya >= ambang batas saat ini.
    """
    raw_thresh = SystemSetting.get_value("auto_mapping_threshold", "85")
    try:
        threshold = float(raw_thresh)
    except (ValueError, TypeError):
        threshold = 85.0

    threshold_fraction = threshold / 100.0

    # Cari semua PR berstatus NEED_MAPPING
    pending_prs = PrPoData.query.filter_by(status_ai="NEED_MAPPING").all()
    approved_count = 0
    errors = []

    for pr in pending_prs:
        # Ambil top candidate dari mapping_log
        top_log = MappingLog.query.filter_by(
            pr_po_data_id=pr.id,
            method="FUZZY_MATCH"
        ).order_by(MappingLog.rank_no.asc()).first()

        if not top_log or not top_log.planning_detail_hasil_id:
            continue

        score = float(top_log.confidence_score or 0.0)
        
        # Cek part code mismatch
        detail = db.session.get(PlanningDetail, top_log.planning_detail_hasil_id)
        if not detail:
            continue

        pr_code = AdvancedMappingService.extract_code(pr.description)
        cand_code = AdvancedMappingService.extract_code(detail.item)
        code_mismatch = (pr_code is not None and cand_code is not None and pr_code != cand_code)

        # Jika skor mencukupi dan tidak ada perbedaan kode
        if score >= threshold_fraction and not code_mismatch:
            old_planning_detail_id = pr.planning_detail_id

            if pr.kategori_id != detail.kategori_id:
                pr.kategori_id_koreksi = detail.kategori_id
            pr.kategori_id = detail.kategori_id
            pr.planning_detail_id = detail.id
            pr.status_ai = "DONE"
            pr.perlu_review = False
            top_log.is_selected = True

            _recalculate_planning_status(detail.id)
            if old_planning_detail_id and old_planning_detail_id != detail.id:
                _recalculate_planning_status(old_planning_detail_id)

            BudgetMonitoringService.calculate_budget_consumption(pr)
            approved_count += 1

    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"{approved_count} PR berhasil disetujui otomatis sesuai ambang batas {threshold:.0f}%.",
        "approved_count": approved_count,
        "threshold": threshold
    }), 200