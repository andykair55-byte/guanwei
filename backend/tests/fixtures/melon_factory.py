"""
瓜测试数据工厂
生成各种状态、类别的测试瓜数据（纯字典，不依赖数据库）
"""
from datetime import datetime, timedelta


MELON_CATEGORIES = [
    "娱乐",
    "科技",
    "财经",
    "社会",
    "体育",
    "政治",
]

MELON_STATUSES = [
    "pending",
    "verifying",
    "verified",
    "revealed",
    "failed",
]


def create_test_melon(title="测试瓜", **kwargs):
    """创建测试瓜字典

    Args:
        title: 瓜的标题
        **kwargs: 覆盖默认字段的参数

    Returns:
        dict: 瓜数据字典
    """
    default_melon = {
        "id": 1,
        "title": title,
        "description": "这是一个测试瓜的描述内容，用于测试各种功能。",
        "cover_image": "",
        "category": "娱乐",
        "creator_id": 1,
        "result": None,
        "status": "pending",
        "reveal_time": None,
        "participant_count": 0,
        "true_count": 0,
        "false_count": 0,
        "created_at": datetime.utcnow(),
    }
    default_melon.update(kwargs)
    return default_melon


def create_pending_melon(title="待求证瓜", **kwargs):
    """创建待求证状态的瓜

    Args:
        title: 瓜的标题
        **kwargs: 额外参数

    Returns:
        dict: 待求证瓜数据
    """
    return create_test_melon(
        title=title,
        status="pending",
        result=None,
        **kwargs,
    )


def create_verified_melon(title="已实锤瓜", result=True, **kwargs):
    """创建已实锤的瓜

    Args:
        title: 瓜的标题
        result: 结果（True=真，False=假）
        **kwargs: 额外参数

    Returns:
        dict: 已实锤瓜数据
    """
    return create_test_melon(
        title=title,
        status="verified",
        result=result,
        participant_count=100,
        true_count=60 if result else 40,
        false_count=40 if result else 60,
        **kwargs,
    )


def create_revealed_melon(title="已揭晓瓜", result=True, **kwargs):
    """创建已揭晓的瓜

    Args:
        title: 瓜的标题
        result: 结果（True=真，False=假）
        **kwargs: 额外参数

    Returns:
        dict: 已揭晓瓜数据
    """
    return create_test_melon(
        title=title,
        status="revealed",
        result=result,
        reveal_time=datetime.utcnow() - timedelta(hours=1),
        participant_count=200,
        true_count=120 if result else 80,
        false_count=80 if result else 120,
        **kwargs,
    )


def create_true_melon(title="真瓜", **kwargs):
    """创建结果为真的瓜

    Args:
        title: 瓜的标题
        **kwargs: 额外参数

    Returns:
        dict: 真瓜数据
    """
    return create_verified_melon(
        title=title,
        result=True,
        **kwargs,
    )


def create_fake_melon(title="假瓜", **kwargs):
    """创建结果为假的瓜

    Args:
        title: 瓜的标题
        **kwargs: 额外参数

    Returns:
        dict: 假瓜数据
    """
    return create_verified_melon(
        title=title,
        result=False,
        **kwargs,
    )


def create_melon_by_category(category, **kwargs):
    """创建指定类别的瓜

    Args:
        category: 瓜的类别
        **kwargs: 额外参数

    Returns:
        dict: 指定类别的瓜数据
    """
    if category not in MELON_CATEGORIES:
        raise ValueError(f"未知类别: {category}，有效类别: {MELON_CATEGORIES}")
    return create_test_melon(
        title=f"{category}测试瓜",
        category=category,
        **kwargs,
    )


def create_popular_melon(title="热门瓜", participant_count=500, **kwargs):
    """创建热门瓜（高参与度）

    Args:
        title: 瓜的标题
        participant_count: 参与人数
        **kwargs: 额外参数

    Returns:
        dict: 热门瓜数据
    """
    true_count = participant_count // 2 + 50
    false_count = participant_count - true_count
    return create_test_melon(
        title=title,
        participant_count=participant_count,
        true_count=true_count,
        false_count=false_count,
        **kwargs,
    )


def create_evidence(melon_id=1, user_id=1, direction=True, **kwargs):
    """创建佐证数据

    Args:
        melon_id: 瓜ID
        user_id: 用户ID
        direction: 佐证方向（True=支持真，False=支持假）
        **kwargs: 额外参数

    Returns:
        dict: 佐证数据字典
    """
    default_evidence = {
        "id": 1,
        "melon_id": melon_id,
        "user_id": user_id,
        "guess_id": 1,
        "content": "这是一条佐证内容，提供了相关的证据支持。",
        "upvotes": 0,
        "downvotes": 0,
        "is_best": False,
        "direction": direction,
        "created_at": datetime.utcnow(),
    }
    default_evidence.update(kwargs)
    return default_evidence


def create_guess(user_id=1, melon_id=1, choice=True, **kwargs):
    """创建猜瓜记录

    Args:
        user_id: 用户ID
        melon_id: 瓜ID
        choice: 猜测选择（True=真，False=假）
        **kwargs: 额外参数

    Returns:
        dict: 猜瓜记录字典
    """
    default_guess = {
        "id": 1,
        "user_id": user_id,
        "melon_id": melon_id,
        "choice": choice,
        "is_correct": None,
        "points_earned": 0,
        "guessed_at": datetime.utcnow(),
    }
    default_guess.update(kwargs)
    return default_guess


def create_correct_guess(user_id=1, melon_id=1, **kwargs):
    """创建猜对的记录

    Args:
        user_id: 用户ID
        melon_id: 瓜ID
        **kwargs: 额外参数

    Returns:
        dict: 猜对记录字典
    """
    return create_guess(
        user_id=user_id,
        melon_id=melon_id,
        choice=True,
        is_correct=True,
        points_earned=30,
        **kwargs,
    )


def create_wrong_guess(user_id=1, melon_id=1, **kwargs):
    """创建猜错的记录

    Args:
        user_id: 用户ID
        melon_id: 瓜ID
        **kwargs: 额外参数

    Returns:
        dict: 猜错记录字典
    """
    return create_guess(
        user_id=user_id,
        melon_id=melon_id,
        choice=True,
        is_correct=False,
        points_earned=0,
        **kwargs,
    )


def create_points_record(user_id=1, amount=10, record_type="login", description="测试积分", **kwargs):
    """创建积分记录

    Args:
        user_id: 用户ID
        amount: 积分变动数量
        record_type: 记录类型
        description: 描述
        **kwargs: 额外参数

    Returns:
        dict: 积分记录字典
    """
    default_record = {
        "id": 1,
        "user_id": user_id,
        "amount": amount,
        "type": record_type,
        "description": description,
        "created_at": datetime.utcnow(),
    }
    default_record.update(kwargs)
    return default_record


def get_all_categories():
    """获取所有瓜类别

    Returns:
        list: 类别列表
    """
    return MELON_CATEGORIES.copy()


def get_all_statuses():
    """获取所有瓜状态

    Returns:
        list: 状态列表
    """
    return MELON_STATUSES.copy()
