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
