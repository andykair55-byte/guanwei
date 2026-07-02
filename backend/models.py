"""数据库模型"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    nickname = Column(String(50))
    password_hash = Column(String(255))
    avatar = Column(String(500), default="")
    points = Column(Integer, default=100)
    rank = Column(String(20), default="吃瓜群众")
    is_admin = Column(Boolean, default=False)
    total_guesses = Column(Integer, default=0)
    correct_guesses = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    guesses = relationship("Guess", back_populates="user")
    evidences = relationship("Evidence", back_populates="user")
    points_records = relationship("PointsRecord", back_populates="user")

class Melon(Base):
    """瓜（待求证内容）"""
    __tablename__ = "melons"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    description = Column(Text)
    cover_image = Column(String(500), default="")
    category = Column(String(20))
    creator_id = Column(Integer, ForeignKey("users.id"))
    result = Column(Boolean, nullable=True)
    status = Column(String(20), default="pending")
    reveal_time = Column(DateTime)
    participant_count = Column(Integer, default=0)
    true_count = Column(Integer, default=0)
    false_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    guesses = relationship("Guess", back_populates="melon")
    evidences = relationship("Evidence", back_populates="melon")
    report = relationship("Report", back_populates="melon", uselist=False)

class Guess(Base):
    """用户猜瓜记录"""
    __tablename__ = "guesses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    melon_id = Column(Integer, ForeignKey("melons.id"))
    choice = Column(Boolean)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Integer, default=0)
    guessed_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="guesses")
    melon = relationship("Melon", back_populates="guesses")
    evidence = relationship("Evidence", back_populates="guess", uselist=False)

class Evidence(Base):
    """用户佐证"""
    __tablename__ = "evidences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    melon_id = Column(Integer, ForeignKey("melons.id"))
    guess_id = Column(Integer, ForeignKey("guesses.id"))
    content = Column(Text)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    is_best = Column(Boolean, default=False)
    direction = Column(Boolean)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="evidences")
    melon = relationship("Melon", back_populates="evidences")
    guess = relationship("Guess", back_populates="evidence")

class Report(Base):
    """AI实锤报告"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    melon_id = Column(Integer, ForeignKey("melons.id"))
    timeline = Column(Text)
    evidence_chain = Column(Text)
    key_doubts = Column(Text)
    tendency = Column(String(100))
    tendency_direction = Column(Boolean)
    disclaimer = Column(String(500))
    generated_at = Column(DateTime, default=datetime.utcnow)

    melon = relationship("Melon", back_populates="report")
    evidence_items = relationship("EvidenceChain", back_populates="report")


class EvidenceChain(Base):
    """证据链（AI 生成的结构化证据）"""
    __tablename__ = "evidence_chains"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    source_url = Column(String(1000))             # 来源 URL
    source_type = Column(String(20))              # 来源类型：official/media/social/forum
    credibility_level = Column(Integer, default=3) # 可信度等级：1-5星
    timestamp = Column(DateTime)                  # 证据时间戳
    content_summary = Column(Text)                # 内容摘要
    relevance_score = Column(Float, default=0.0)  # 相关性评分：0-1
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="evidence_items")

class PointsRecord(Base):
    """积分变动记录"""
    __tablename__ = "points_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Integer)
    type = Column(String(20))
    description = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="points_records")


class AuditLog(Base):
    """操作审计日志"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"))
    admin_name = Column(String(50))
    action = Column(String(50))          # reveal_melon, delete_user, adjust_points, etc.
    target_type = Column(String(30))     # melon, user, pipeline, llm
    target_id = Column(Integer, nullable=True)
    detail = Column(Text, default="")    # JSON 字符串，记录操作前后状态
    ip_address = Column(String(45), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class PipelineRun(Base):
    """Pipeline 运行记录"""
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(String(36), unique=True, index=True)
    input_content = Column(Text)
    status = Column(String(20), default="pending")  # pending / running / success / failed / timeout
    duration_ms = Column(Integer, default=0)
    node_results = Column(Text, default="{}")        # JSON: 每个节点的执行状态
    error_message = Column(Text, default="")
    event_log = Column(Text, default="[]")            # JSON: 完整事件日志
    created_at = Column(DateTime, default=datetime.utcnow)
