"""
猜瓜业务服务层
负责猜瓜提交、查询、佐证点赞等业务逻辑
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends

from database import get_db
from models import User, Melon, Guess, Evidence, PointsRecord
from ranks import calculate_rank


class GuessService:
    """猜瓜服务"""

    def __init__(self, db: Session):
        self.db = db

    def submit_guess(
        self,
        user_id: int,
        melon_id: int,
        choice: bool,
        evidence_content: Optional[str] = None
    ) -> Guess:
        """提交猜瓜 - 完整业务流程"""
        melon = self.db.query(Melon).filter(Melon.id == melon_id).first()
        if not melon:
            raise HTTPException(status_code=404, detail="瓜不存在")

        existing_guess = self.db.query(Guess).filter(
            Guess.user_id == user_id,
            Guess.melon_id == melon_id
        ).first()
        if existing_guess:
            raise HTTPException(status_code=400, detail="你已经猜过了")

        guess = Guess(
            user_id=user_id,
            melon_id=melon_id,
            choice=choice
        )
        self.db.add(guess)
        self.db.flush()

        melon.participant_count += 1
        if choice:
            melon.true_count += 1
        else:
            melon.false_count += 1

        user = self.db.query(User).filter(User.id == user_id).first()
        user.total_guesses += 1

        if melon.result is not None:
            is_correct = (choice == melon.result)
            guess.is_correct = is_correct
            if is_correct:
                user.correct_guesses += 1
                points_earned = 30
                guess.points_earned = points_earned
                self._add_points(
                    user_id=user_id,
                    amount=points_earned,
                    record_type="guess_correct",
                    description=f"猜对「{melon.title[:20]}」"
                )

        if evidence_content:
            evidence = Evidence(
                user_id=user_id,
                melon_id=melon_id,
                guess_id=guess.id,
                content=evidence_content,
                direction=choice
            )
            self.db.add(evidence)
            self._add_points(
                user_id=user_id,
                amount=5,
                record_type="guess_correct",
                description="提交佐证"
            )

        self._update_rank(user)

        self.db.commit()
        self.db.refresh(guess)
        return guess

    def get_my_guess(self, user_id: int, melon_id: int) -> dict:
        """获取用户的猜瓜记录"""
        guess = self.db.query(Guess).filter(
            Guess.user_id == user_id,
            Guess.melon_id == melon_id
        ).first()
        if not guess:
            return {"guess": None, "evidence": None}

        user = self.db.query(User).filter(User.id == user_id).first()
        evidence = self.db.query(Evidence).filter(Evidence.guess_id == guess.id).first()

        return {
            "guess": {
                "id": guess.id,
                "choice": guess.choice,
                "is_correct": guess.is_correct,
                "points_earned": guess.points_earned,
                "guessed_at": guess.guessed_at
            },
            "evidence": {
                "id": evidence.id,
                "user_id": evidence.user_id,
                "user_nickname": user.nickname if user else "",
                "user_avatar": user.avatar if user else "",
                "melon_id": evidence.melon_id,
                "content": evidence.content,
                "upvotes": evidence.upvotes,
                "downvotes": evidence.downvotes,
                "is_best": evidence.is_best,
                "direction": evidence.direction,
                "created_at": evidence.created_at
            } if evidence else None
        }

    def upvote_evidence(self, evidence_id: int, current_user_id: int) -> dict:
        """点赞佐证"""
        evidence = self.db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(status_code=404, detail="佐证不存在")

        evidence.upvotes += 1
        author = self.db.query(User).filter(User.id == evidence.user_id).first()
        if author and author.id != current_user_id:
            self._add_points(
                user_id=author.id,
                amount=2,
                record_type="guess_correct",
                description="佐证被点赞"
            )

        self.db.commit()
        return {"success": True, "upvotes": evidence.upvotes}

    def downvote_evidence(self, evidence_id: int) -> dict:
        """踩佐证"""
        evidence = self.db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(status_code=404, detail="佐证不存在")

        evidence.downvotes += 1
        self.db.commit()
        return {"success": True, "downvotes": evidence.downvotes}

    def _add_points(self, user_id: int, amount: int, record_type: str, description: str) -> None:
        """增加用户积分并创建记录"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.points += amount
            record = PointsRecord(
                user_id=user_id,
                amount=amount,
                type=record_type,
                description=description
            )
            self.db.add(record)

    def _update_rank(self, user: User) -> None:
        """更新用户段位"""
        user.rank = calculate_rank(user.correct_guesses, user.total_guesses)


def get_guess_service(db: Session = Depends(get_db)) -> GuessService:
    """获取猜瓜服务实例"""
    return GuessService(db)
