from utils.db import db

class PlanningHeader(db.Model):
    __tablename__ = "planning_header"
    id = db.Column(
        db.BigInteger,
        primary_key=True)
    periode = db.Column(
        db.String(30),
        nullable=False)
    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id"),
        nullable=False)
    filename = db.Column(
        db.String(255),
        nullable=False
    )
    status = db.Column(
        db.Enum(
            "UPLOADING",
            "SUCCESS",
            "FAILED"
        ),
        default="UPLOADING",
        
    )
    uploaded_at = db.Column(
        db.DateTime()
    )
    created_at = db.Column(
        db.DateTime(),
        server_default=db.func.current_timestamp()
    )
    updated_at = db.Column(
        db.DateTime(),
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )
    user = db.relationship(
        "User",
        backref="planing_headers"
    )

    planning_details = db.relationship(
        "PlanningDetail",
        backref="planning_header",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "periode": self.periode,
            "user_id": self.user_id,
            "filename": self.filename,
            "status": self.status,
            "uploaded_at": self.uploaded_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    
        
    