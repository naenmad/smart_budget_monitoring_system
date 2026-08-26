SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {
        "title": "Smart Budget Monitoring & QC System API",
        "description": (
            "Dokumentasi REST API internal PT Summit Adyawinsa Indonesia (SAI) "
            "untuk monitoring realisasi budget, otomatisasi klasifikasi AI PR/PO, "
            "dan pelacakan procurement stages."
        ),
        "version": "1.0.0",
        "contact": {
            "name": "PT Summit Adyawinsa Indonesia - IT & QC Team",
            "url": "http://www.summitadyawinsa.co.id",
        },
    },
    "basePath": "/api/v1",
    "schemes": ["http", "https"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": (
                "Masukkan token JWT dengan format: **Bearer &lt;token&gt;**\n"
                "Contoh: `Bearer eyJhbGciOiJIUzI1NiIsIn...`"
            ),
        }
    },
    "tags": [
        {"name": "Authentication & Users", "description": "Manajemen akun pengguna dan autentikasi JWT"},
        {"name": "Budget & Planning", "description": "Monitoring budget, realisasi bulanan, dan summary per kategori"},
        {"name": "PR / PO Tracking & Stages", "description": "Pelacakan alur PR -> PO -> GR dan retry pipeline"},
        {"name": "Data Klasifikasi PR / PO", "description": "Dataset hasil klasifikasi, koreksi manual, dan review queue"},
        {"name": "AI & Machine Learning", "description": "Prediksi kategori otomatis (Regex, Rule-Based, SVM) dan training ulang model"},
        {"name": "Item Mapping & Threshold", "description": "Kandidat item budget mapping, auto-approval, dan ambang batas AI"},
        {"name": "Upload & Batch History", "description": "Unggah file Excel PR/PO, Planning Budget, dan riwayat upload"},
        {"name": "Kategori Reference", "description": "Master data kategori budget (E-1, E-9, I-1, CAPEX, dll.)"},
    ],
}

SWAGGER_CONFIG = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec_1",
            "route": "/apispec_1.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/",
    "title": "Smart Budget Monitoring API Docs",
}
