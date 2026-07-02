"""扩展种子数据 - 模拟真实用户"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User, Melon, Guess, Evidence, PointsRecord
from auth import get_password_hash
import random

# 模拟用户数据
MOCK_USERS = [
    {"username": "瓜田老农", "nickname": "瓜田老农", "points": 2580, "rank": "瓜王", "total_guesses": 156, "correct_guesses": 142},
    {"username": "真相挖掘机", "nickname": "真相挖掘机", "points": 1890, "rank": "侦探大师", "total_guesses": 98, "correct_guesses": 87},
    {"username": "吃瓜群众甲", "nickname": "吃瓜群众甲", "points": 860, "rank": "资深吃瓜", "total_guesses": 67, "correct_guesses": 52},
    {"username": "八卦小灵通", "nickname": "八卦小灵通", "points": 1230, "rank": "八卦达人", "total_guesses": 89, "correct_guesses": 71},
    {"username": "理性分析帝", "nickname": "理性分析帝", "points": 3200, "rank": "瓜王", "total_guesses": 203, "correct_guesses": 189},
    {"username": "真相只有一个", "nickname": "真相只有一个", "points": 650, "rank": "见习侦探", "total_guesses": 45, "correct_guesses": 32},
    {"username": "键盘侠本侠", "nickname": "键盘侠本侠", "points": 320, "rank": "吃瓜群众", "total_guesses": 28, "correct_guesses": 15},
    {"username": "佛系吃瓜", "nickname": "佛系吃瓜", "points": 580, "rank": "见习侦探", "total_guesses": 42, "correct_guesses": 31},
    {"username": "柯南附体", "nickname": "柯南附体", "points": 2100, "rank": "侦探大师", "total_guesses": 134, "correct_guesses": 118},
    {"username": "瓜田过客", "nickname": "瓜田过客", "points": 150, "rank": "吃瓜群众", "total_guesses": 12, "correct_guesses": 6},
]

def seed_extended_users(db: Session):
    """创建扩展用户数据"""
    # 检查是否已有扩展用户
    existing = db.query(User).filter(User.username == "瓜田老农").first()
    if existing:
        print("扩展用户已存在，跳过")
        return

    user_ids = []
    for user_data in MOCK_USERS:
        user = User(
            username=user_data["username"],
            nickname=user_data["nickname"],
            password_hash=get_password_hash("123456"),
            avatar=f"https://picsum.photos/seed/{user_data['username']}/80/80",
            points=user_data["points"],
            rank=user_data["rank"],
            total_guesses=user_data["total_guesses"],
            correct_guesses=user_data["correct_guesses"],
            created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180))
        )
        db.add(user)
        db.flush()
        user_ids.append(user.id)
        
        # 为每个用户创建积分记录
        record = PointsRecord(
            user_id=user.id,
            amount=100,
            type="login",
            description="新用户注册奖励",
            created_at=user.created_at
        )
        db.add(record)

    db.commit()
    print(f"已创建 {len(MOCK_USERS)} 个扩展用户")
    return user_ids


def seed_more_melons(db: Session, user_ids: list):
    """创建更多瓜数据，包含已揭晓的"""
    existing_count = db.query(Melon).count()
    if existing_count >= 20:
        print("瓜数据已足够，跳过")
        return

    NEW_MELONS = [
        ("某新能源车被曝冬季续航虚标40%", "车主集体维权，实测续航与官方宣传严重不符，引发广泛关注", "科技", True),
        ("网传某高校教授学术造假被开除", "多篇论文被发现存在数据造假，校方已成立调查组", "社会热点", True),
        ("某网红餐厅被曝使用地沟油", "前员工匿名举报，市场监管部门已介入调查", "社会热点", False),
        ("人类首次登陆火星？NASA紧急辟谣", "网传NASA宣布载人火星任务成功，官方澄清为虚假信息", "科技", False),
        ("某顶流明星被曝偷税漏税", "税务部门已介入调查，工作室发声明否认", "娱乐", None),
        ("这种水果吃多了会中毒？", "朋友圈疯传某种常见水果过量食用会导致中毒", "生活科普", None),
        ("某城市宣布取消限购政策", "房地产市场迎来重大变化，刚需购房者如何应对", "财经", None),
        ("出土文物证明某历史记载错误", "考古新发现颠覆了教科书上的历史认知", "历史", None),
    ]

    for i, (title, desc, category, result) in enumerate(NEW_MELONS):
        creator_id = random.choice(user_ids)
        participant_count = random.randint(50, 3000)
        true_count = int(participant_count * random.uniform(0.3, 0.7))
        false_count = participant_count - true_count
        
        status = "verified" if result is not None else "pending"
        reveal_time = (
            datetime.utcnow() - timedelta(hours=random.randint(1, 24))
            if result is not None
            else datetime.utcnow() + timedelta(hours=random.randint(1, 48))
        )

        melon = Melon(
            title=title,
            description=desc,
            cover_image=f"https://picsum.photos/seed/melon_new{i}/400/200",
            category=category,
            creator_id=creator_id,
            result=result,
            status=status,
            reveal_time=reveal_time,
            participant_count=participant_count,
            true_count=true_count,
            false_count=false_count,
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
        )
        db.add(melon)

    db.commit()
    print(f"已创建 {len(NEW_MELONS)} 条新瓜数据")


if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_extended_users(db)
        user_ids = [u.id for u in db.query(User).filter(User.username.in_([u["username"] for u in MOCK_USERS])).all()]
        seed_more_melons(db, user_ids)
    finally:
        db.close()
