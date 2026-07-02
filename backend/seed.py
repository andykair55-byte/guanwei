"""种子数据"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User, Melon
from auth import get_password_hash
import random

CATEGORIES = ["娱乐", "科技", "生活科普", "社会热点", "历史", "财经"]

MELON_TITLES = [
    ("某明星被曝秘密领证", "据传某顶流明星与圈外女友已秘密领证半年，双方工作室均未回应。", "娱乐"),
    ("新型电池技术突破", "某科研团队宣布研发出续航提升3倍的新型锂电池，即将量产。", "科技"),
    ("喝隔夜水会致癌", "网传喝隔夜水会产生亚硝酸盐，长期饮用会致癌。", "生活科普"),
    ("某地出现不明飞行物", "多人目击天空出现三角形不明飞行物，持续飞行约10分钟后消失。", "社会热点"),
    ("秦始皇陵已被打开", "网传考古队已经打开秦始皇陵，发现大量珍贵文物。", "历史"),
    ("某公司裁员30%", "网传某互联网大厂计划裁员30%，涉及多个业务线。", "财经"),
    ("某综艺节目停播", "热门综艺节目因内容问题被广电总局要求停播整改。", "娱乐"),
    ("AI通过图灵测试", "某AI系统在最新图灵测试中通过率达到90%，引发广泛讨论。", "科技"),
    ("吃菠菜能补铁", "从小听大人说吃菠菜补铁，但事实真的如此吗？", "生活科普"),
    ("某城市房价暴跌", "网传某一线城市房价一个月内暴跌20%，开发商跑路。", "社会热点"),
    ("诸葛亮是被气死的", "三气周瑜的故事家喻户晓，但诸葛亮的真实死因是什么？", "历史"),
    ("比特币突破10万美元", "比特币价格突破10万美元大关，创历史新高。", "财经"),
]

def seed_database(db: Session):
    if db.query(User).count() > 0:
        return
    # 管理员账号
    admin_user = User(
        username="admin",
        nickname="管理员",
        password_hash=get_password_hash("123"),
        avatar="https://picsum.photos/seed/admin/80/80",
        points=9999,
        rank="见微先知",
        is_admin=True,
        total_guesses=0,
        correct_guesses=0
    )
    db.add(admin_user)

    test_user = User(
        username="test",
        nickname="测试用户",
        password_hash=get_password_hash("123456"),
        avatar="https://picsum.photos/seed/testuser/80/80",
        points=100,
        rank="吃瓜群众",
        total_guesses=0,
        correct_guesses=0
    )
    db.add(test_user)
    db.flush()
    
    for i, (title, desc, category) in enumerate(MELON_TITLES):
        is_verified = i >= 8
        result = random.choice([True, False]) if is_verified else None
        participant_count = random.randint(100, 5000)
        true_count = int(participant_count * random.uniform(0.3, 0.7))
        false_count = participant_count - true_count
        melon = Melon(
            title=title,
            description=desc,
            cover_image=f"https://picsum.photos/seed/melon{i}/400/200",
            category=category,
            creator_id=test_user.id,
            result=result,
            status="verified" if is_verified else "pending",
            reveal_time=datetime.utcnow() - timedelta(hours=random.randint(1, 24)) if is_verified else datetime.utcnow() + timedelta(hours=random.randint(1, 48)),
            participant_count=participant_count,
            true_count=true_count,
            false_count=false_count
        )
        db.add(melon)
    
    db.commit()
    print("种子数据已创建")
